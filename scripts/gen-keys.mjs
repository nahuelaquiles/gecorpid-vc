import { generateKeyPair, exportJWK } from "jose";

// Genera Ed25519 (EdDSA) y marca las claves como "extractable"
const { publicKey, privateKey } = await generateKeyPair("EdDSA", {
  crv: "Ed25519",
  extractable: true
});

const pub  = await exportJWK(publicKey);
const priv = await exportJWK(privateKey);

pub.alg  = "EdDSA"; pub.use  = "sig";  // metadatos útiles
priv.alg = "EdDSA"; priv.use = "sig";

console.log("PUBLIC_JWK:\\n",  JSON.stringify(pub,  null, 2));
console.log("PRIVATE_JWK:\\n", JSON.stringify(priv, null, 2));
