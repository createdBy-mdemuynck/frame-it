const sharp = require("sharp");
const fs = require("fs");

const testFile = "./uploads/maarten.demuynck@sirus.be/1775133583282_Screenshot_2024-10-04_082627.png";
const thumbFile = "./uploads/maarten.demuynck@sirus.be/thumbnails/1775133583282_Screenshot_2024-10-04_082627.png";

console.log("Sharp versions:", sharp.versions);
console.log("\nTesting file:", testFile);
console.log("File exists:", fs.existsSync(testFile));

if (fs.existsSync(testFile)) {
  const stats = fs.statSync(testFile);
  console.log("File size:", stats.size, "bytes");

  console.log("\nAttempting to read image metadata...");
  sharp(testFile)
    .metadata()
    .then((metadata) => {
      console.log("✅ Metadata:", JSON.stringify(metadata, null, 2));

      console.log("\nAttempting to resize...");
      return sharp(testFile).resize(150, 150).toFile(thumbFile);
    })
    .then((info) => {
      console.log("✅ Thumbnail created:", JSON.stringify(info, null, 2));
    })
    .catch((err) => {
      console.error("❌ Error:", err.message);
      console.error("Stack:", err.stack);
    });
}
