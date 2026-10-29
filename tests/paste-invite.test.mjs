import test from "node:test";
import assert from "node:assert/strict";
import { parseInvitationText, encodeInvitation } from "../src/domain.js";
const token = "10000000-0000-0000-0000-000000000001";
const hash = "#join=" + token;
test("invitación como texto: mensaje WhatsApp, enlace, fragmento o código sin navegar", () => {
  for (const text of [
    "apuntes://open" + hash,
    "Te invito a Física 🎓\n(apuntes://open" +
      hash +
      ").\nAbre Tareas y pega este mensaje",
    hash,
    token,
    "https://example.com/Tareas/" + hash,
  ]) {
    assert.deepEqual(parseInvitationText(text), {
      kind: "shared",
      hash,
      token,
    });
  }
  assert.equal(
    parseInvitationText("apuntes://open" + hash + "\napuntes://open" + hash)
      .token,
    token,
  );
});
test("copias pegadas conservan solo el fragmento y rechazan mensajes ambiguos", () => {
  const encoded = encodeInvitation({ title: "Física · ñ 🎓", tasks: [] });
  assert.deepEqual(
    parseInvitationText(
      "Te comparto una copia:\napuntes://open#apuntes=" + encoded,
    ),
    { kind: "copy", hash: "#apuntes=" + encoded, encoded },
  );
  assert.throws(
    () =>
      parseInvitationText(
        "apuntes://open" + hash + "\nhttps://example.com/#apuntes=" + encoded,
      ),
    /varias invitaciones/,
  );
});
test("pegar nunca acepta OAuth, tokens de sesión, esquemas ejecutables o enlaces recortados", () => {
  for (const text of [
    "",
    null,
    "normal text",
    "a".repeat(40001),
    "javascript:alert(1)",
    "data:text/html,test",
    "apuntes://evil" + hash,
    "apuntes://user@open" + hash,
    "apuntes://open:99" + hash,
    "apuntes://open/evil" + hash,
    "apuntes://open?code=oauth" + hash,
    "apuntes://open#oauth=code=x",
    "apuntes://open#access_token=secret",
    "apuntes://open#join=truncated",
    "apuntes://open" + hash + "extra",
    "apuntes://open#apuntes=@@@",
  ])
    assert.throws(() => parseInvitationText(text), String(text).slice(0, 60));
});

test("el esquema nativo no depende del soporte URL de un WebView", (t) => {
  const original = globalThis.URL;
  t.after(() => (globalThis.URL = original));
  globalThis.URL = class extends original {
    constructor(value) {
      if (value.startsWith("apuntes:")) throw Error("non-special URI");
      super(value);
    }
  };
  assert.equal(parseInvitationText("apuntes://open" + hash).token, token);
  const encoded = encodeInvitation({ title: "Copia" });
  assert.equal(
    parseInvitationText("apuntes://open#apuntes=" + encoded).encoded,
    encoded,
  );
});
