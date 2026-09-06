import { describe, expect, it } from "vitest";
import { detectImageType, extensionFor, MAX_IMAGE_BYTES, rejectionReason } from "./images";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

function webp(): Uint8Array {
  const bytes = new Uint8Array(16);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  bytes.set([0x57, 0x45, 0x42, 0x50], 8); // "WEBP"
  return bytes;
}

describe("detectImageType", () => {
  it("reconhece JPEG, PNG e WebP pela assinatura", () => {
    expect(detectImageType(JPEG)).toBe("image/jpeg");
    expect(detectImageType(PNG)).toBe("image/png");
    expect(detectImageType(webp())).toBe("image/webp");
  });

  it("recusa SVG, que é XML e aceitaria script", () => {
    // Servido da mesma origem da aplicação, um SVG com <script> viraria XSS.
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(detectImageType(svg)).toBeNull();
  });

  it("recusa arquivo que só finge ser imagem", () => {
    const html = new TextEncoder().encode("<!doctype html><script>alert(1)</script>");
    expect(detectImageType(html)).toBeNull();
  });

  it("não confunde RIFF de outro formato com WebP", () => {
    // Um WAV também começa com "RIFF"; o que distingue é o rótulo no byte 8.
    const wav = new Uint8Array(16);
    wav.set([0x52, 0x49, 0x46, 0x46], 0);
    wav.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"
    expect(detectImageType(wav)).toBeNull();
  });

  it("não estoura com arquivo curto demais para a assinatura", () => {
    expect(detectImageType(new Uint8Array([0x52, 0x49]))).toBeNull();
  });
});

describe("rejectionReason", () => {
  it("aceita uma imagem válida", () => {
    expect(rejectionReason(PNG)).toBeNull();
  });

  it("recusa arquivo vazio", () => {
    expect(rejectionReason(new Uint8Array(0))).toContain("vazio");
  });

  it("recusa arquivo acima do limite", () => {
    const grande = new Uint8Array(MAX_IMAGE_BYTES + 1);
    grande.set([0xff, 0xd8, 0xff], 0);
    expect(rejectionReason(grande)).toContain("MB");
  });

  it("recusa formato não suportado", () => {
    expect(rejectionReason(new TextEncoder().encode("nada disso"))).toContain("JPEG");
  });
});

describe("extensionFor", () => {
  it("mapeia cada tipo para uma extensão", () => {
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/png")).toBe("png");
    expect(extensionFor("image/webp")).toBe("webp");
  });
});
