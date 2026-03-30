import sharp from 'sharp';

async function run() {
  await sharp('client/public/logo.png')
    .resize(512, 512)
    .png({ quality: 80, compressionLevel: 9 })
    .toFile('client/public/icon-app.png');
  console.log('Done');
}

run().catch(console.error);
