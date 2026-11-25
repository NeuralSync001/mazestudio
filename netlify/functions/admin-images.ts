import { randomUUID } from "node:crypto";
import type { Handler } from "@netlify/functions";
import {
  isAllowedMutation,
  json,
  logSafeFailure,
  parseJsonBody,
  withSessionCookie,
} from "./_shared/http";
import {
  getAssuranceLevel,
  hasAdminRole,
  restoreSession,
} from "./_shared/supabase";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ImageFile = {
  bytes: Buffer;
  extension: "jpg" | "png" | "webp";
  contentType: "image/jpeg" | "image/png" | "image/webp";
};

function decodeImage(dataUrl: string): ImageFile | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    dataUrl,
  );
  if (!match) return null;

  const contentType = match[1] as ImageFile["contentType"];
  const encoded = match[2];
  if (encoded.length > Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 4) return null;
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return null;

  let validSignature = false;
  let extension: ImageFile["extension"] = "jpg";
  if (contentType === "image/png") {
    validSignature =
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    extension = "png";
  } else if (contentType === "image/jpeg") {
    validSignature =
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;
    extension = "jpg";
  } else {
    validSignature =
      bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP";
    extension = "webp";
  }

  return validSignature ? { bytes, extension, contentType } : null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Ação não permitida." }, { Allow: "POST" });
  }
  if (!isAllowedMutation(event)) {
    return json(403, { error: "Origem da solicitação não autorizada." });
  }

  const restored = await restoreSession(event);
  if ("kind" in restored) {
    if (restored.kind === "unavailable") {
      return json(503, {
        error: "O painel ainda não foi conectado ao serviço de autenticação.",
      });
    }
    return json(401, { error: "Sua sessão expirou. Entre novamente." });
  }

  const respond = (
    status: number,
    data: unknown,
  ) =>
    withSessionCookie(
      json(status, data),
      restored.session,
      restored.context.issuedAt,
      restored.context.secureCookie,
    );

  try {
    if (!(await hasAdminRole(restored.client, restored.context.userId))) {
      return respond(403, { error: "Esta conta não tem acesso ao painel." });
    }
    if ((await getAssuranceLevel(restored.client)) !== "aal2") {
      return respond(403, {
        error: "Confirme sua identidade em duas etapas para continuar.",
      });
    }

    const body = await parseJsonBody(event, 4_300_000);
    const productId = typeof body?.productId === "string" ? body.productId : "";
    const altText = typeof body?.altText === "string" ? body.altText.trim() : "";
    const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : "";
    if (
      !body ||
      !UUID_PATTERN.test(productId) ||
      altText.length < 1 ||
      altText.length > 180 ||
      dataUrl.length === 0
    ) {
      return respond(400, {
        error: "Confira a foto, a descrição da imagem e o produto.",
      });
    }

    const image = decodeImage(dataUrl);
    if (!image) {
      return respond(400, {
        error:
          "Use uma imagem JPG, PNG ou WebP válida, com até 3 MB.",
      });
    }

    const { data: product, error: productError } = await restored.client
      .from("products")
      .select("id")
      .eq("id", productId)
      .maybeSingle();
    if (productError || !product) {
      if (productError) logSafeFailure("image-product-check", productError);
      return respond(404, { error: "Produto não encontrado." });
    }

    const { data: oldImage, error: oldImageError } = await restored.client
      .from("product_images")
      .select("id,storage_path")
      .eq("product_id", productId)
      .maybeSingle();
    if (oldImageError) {
      logSafeFailure("image-existing-check", oldImageError);
      return respond(503, {
        error: "Não foi possível preparar a substituição da foto.",
      });
    }

    const path = `${productId}/${randomUUID()}.${image.extension}`;
    const { error: uploadError } = await restored.client.storage
      .from("product-images")
      .upload(path, image.bytes, {
        cacheControl: "900",
        contentType: image.contentType,
        upsert: false,
      });
    if (uploadError) {
      logSafeFailure("image-upload", uploadError);
      return respond(503, {
        error: "Não foi possível enviar a foto. Tente novamente.",
      });
    }

    const imageQuery = oldImage
      ? restored.client
          .from("product_images")
          .update({ storage_path: path, alt_text: altText, sort_order: 0 })
          .eq("id", oldImage.id)
      : restored.client.from("product_images").insert({
          product_id: productId,
          storage_path: path,
          alt_text: altText,
          sort_order: 0,
        });
    const { error: saveImageError } = await imageQuery;
    if (saveImageError) {
      logSafeFailure("image-save-record", saveImageError);
      const { error: cleanupError } = await restored.client.storage
        .from("product-images")
        .remove([path]);
      if (cleanupError) logSafeFailure("image-upload-cleanup", cleanupError);
      return respond(503, {
        error: "A foto não foi vinculada ao produto. Tente novamente.",
      });
    }

    if (oldImage) {
      const { error: cleanupError } = await restored.client.storage
        .from("product-images")
        .remove([oldImage.storage_path]);
      if (cleanupError) {
        logSafeFailure("image-old-file-cleanup", cleanupError);
        return respond(200, {
          warning:
            "A nova foto foi salva, mas a antiga não pôde ser removida do armazenamento.",
        });
      }
    }

    const { data: signed, error: signError } = await restored.client.storage
      .from("product-images")
      .createSignedUrl(path, 900);
    if (signError) {
      logSafeFailure("image-sign", signError);
      return respond(200, {
        warning:
          "A foto foi salva, mas não pôde ser exibida agora. Atualize a página.",
      });
    }

    return respond(200, { imageUrl: signed.signedUrl });
  } catch (error) {
    logSafeFailure("image-upload", error);
    return respond(503, {
      error: "Não foi possível concluir o envio da foto. Tente novamente.",
    });
  }
};
