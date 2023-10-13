// Optimize images

function _optimizeMedia(imgToCompress, resizingFactor, quality) {
  // resizing the image
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  const originalWidth = imgToCompress.width;
  const originalHeight = imgToCompress.height;

  const canvasWidth = originalWidth * resizingFactor;
  const canvasHeight = originalHeight * resizingFactor;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  context.drawImage(
    imgToCompress,
    0,
    0,
    originalWidth * resizingFactor,
    originalHeight * resizingFactor
  );

  // reducing the quality of the image
  canvas.toBlob(
    (blob) => {
      if (blob) {
        // showing the compressed image
        resizedImage.src = URL.createObjectURL(resizedImageBlob);
      }
    },
    "image/jpeg",
    quality
  );
}