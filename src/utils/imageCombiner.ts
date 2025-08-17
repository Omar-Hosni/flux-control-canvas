export interface ImageInfo {
  width: number;
  height: number;
  isPortrait: boolean;
  data: string;
}

export const combineImages = async (image1Info: ImageInfo, image2Info: ImageInfo): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Load images
    const img1 = new Image();
    const img2 = new Image();

    Promise.all([
      new Promise<void>((resolve) => {
        img1.onload = () => resolve();
        img1.src = image1Info.data;
      }),
      new Promise<void>((resolve) => {
        img2.onload = () => resolve();
        img2.src = image2Info.data;
      })
    ]).then(() => {
      // Determine combination strategy
      const img1Area = image1Info.width * image1Info.height;
      const img2Area = image2Info.width * image2Info.height;
      const sizeDifference = Math.abs(img1Area - img2Area) / Math.max(img1Area, img2Area);

      let combinedWidth: number;
      let combinedHeight: number;
      let img1X = 0, img1Y = 0, img1W = image1Info.width, img1H = image1Info.height;
      let img2X = 0, img2Y = 0, img2W = image2Info.width, img2H = image2Info.height;

      // Strategy 1: One image is significantly smaller (>40% difference) - overlay
      if (sizeDifference > 0.4) {
        const [largerInfo, smallerInfo] = 
          img1Area > img2Area ? [image1Info, image2Info] : [image2Info, image1Info];
        
        combinedWidth = largerInfo.width;
        combinedHeight = largerInfo.height;
        
        if (img1Area > img2Area) {
          img1X = 0; img1Y = 0;
          img2X = largerInfo.width - smallerInfo.width - 20; // 20px margin
          img2Y = 20; // 20px margin from top
        } else {
          img2X = 0; img2Y = 0;
          img1X = largerInfo.width - smallerInfo.width - 20;
          img1Y = 20;
        }
      }
      // Strategy 2: Both portrait - side by side
      else if (image1Info.isPortrait && image2Info.isPortrait) {
        const maxHeight = Math.max(image1Info.height, image2Info.height);
        const scale1 = maxHeight / image1Info.height;
        const scale2 = maxHeight / image2Info.height;
        
        img1W = image1Info.width * scale1;
        img1H = maxHeight;
        img2W = image2Info.width * scale2;
        img2H = maxHeight;
        
        combinedWidth = img1W + img2W;
        combinedHeight = maxHeight;
        
        img1X = 0;
        img1Y = 0;
        img2X = img1W;
        img2Y = 0;
      }
      // Strategy 3: Both landscape - stacked vertically
      else if (!image1Info.isPortrait && !image2Info.isPortrait) {
        const maxWidth = Math.max(image1Info.width, image2Info.width);
        const scale1 = maxWidth / image1Info.width;
        const scale2 = maxWidth / image2Info.width;
        
        img1W = maxWidth;
        img1H = image1Info.height * scale1;
        img2W = maxWidth;
        img2H = image2Info.height * scale2;
        
        combinedWidth = maxWidth;
        combinedHeight = img1H + img2H;
        
        img1X = 0;
        img1Y = 0;
        img2X = 0;
        img2Y = img1H;
      }
      // Strategy 4: Mixed orientations - adaptive layout
      else {
        if (image1Info.isPortrait) {
          // Portrait + Landscape: side by side with scaling
          const targetHeight = Math.min(image1Info.height, image2Info.height);
          const scale1 = targetHeight / image1Info.height;
          const scale2 = targetHeight / image2Info.height;
          
          img1W = image1Info.width * scale1;
          img1H = targetHeight;
          img2W = image2Info.width * scale2;
          img2H = targetHeight;
          
          combinedWidth = img1W + img2W;
          combinedHeight = targetHeight;
          
          img1X = 0;
          img1Y = 0;
          img2X = img1W;
          img2Y = 0;
        } else {
          // Landscape + Portrait: side by side with scaling
          const targetHeight = Math.min(image1Info.height, image2Info.height);
          const scale1 = targetHeight / image1Info.height;
          const scale2 = targetHeight / image2Info.height;
          
          img1W = image1Info.width * scale1;
          img1H = targetHeight;
          img2W = image2Info.width * scale2;
          img2H = targetHeight;
          
          combinedWidth = img1W + img2W;
          combinedHeight = targetHeight;
          
          img1X = 0;
          img1Y = 0;
          img2X = img1W;
          img2Y = 0;
        }
      }

      // Set canvas size
      canvas.width = combinedWidth;
      canvas.height = combinedHeight;

      // Fill background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, combinedWidth, combinedHeight);

      // Draw images
      ctx.drawImage(img1, img1X, img1Y, img1W, img1H);
      ctx.drawImage(img2, img2X, img2Y, img2W, img2H);

      // Return data URL
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl);
    }).catch(reject);
  });
};

export const getImageInfo = async (imageUrl: string): Promise<ImageInfo> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        isPortrait: img.height > img.width,
        data: imageUrl
      });
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
};