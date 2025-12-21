#!/usr/bin/env python3
import cv2
import numpy as np
from pathlib import Path

def segment_objects(image_path):
    """Segment objects from white background and save as separate PNGs."""
    # Read the image
    img = cv2.imread(str(image_path))
    if img is None:
        print(f"Error: Could not read image {image_path}")
        return
    
    print(f"Image shape: {img.shape}")
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Threshold to separate objects from white background
    # White background should have high values (close to 255)
    _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
    
    # Apply morphological operations to clean up noise
    kernel = np.ones((5, 5), np.uint8)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    print(f"Found {len(contours)} contours")
    
    # Filter contours by area (remove very small noise)
    min_area = 1000
    valid_contours = [cnt for cnt in contours if cv2.contourArea(cnt) > min_area]
    
    print(f"Found {len(valid_contours)} valid objects (area > {min_area})")
    
    # Create output directory
    output_dir = Path(image_path).parent / "segmented_parts"
    output_dir.mkdir(exist_ok=True)
    
    # Extract and save each object
    for idx, contour in enumerate(valid_contours, 1):
        # Get bounding box
        x, y, w, h = cv2.boundingRect(contour)
        
        # Add padding
        padding = 20
        x1 = max(0, x - padding)
        y1 = max(0, y - padding)
        x2 = min(img.shape[1], x + w + padding)
        y2 = min(img.shape[0], y + h + padding)
        
        # Extract region
        roi = img[y1:y2, x1:x2].copy()
        
        # Create mask for this contour
        mask = np.zeros((y2-y1, x2-x1), dtype=np.uint8)
        
        # Adjust contour coordinates to ROI
        contour_shifted = contour - [x1, y1]
        cv2.drawContours(mask, [contour_shifted], -1, 255, -1)
        
        # Create RGBA image (add alpha channel)
        roi_rgba = cv2.cvtColor(roi, cv2.COLOR_BGR2BGRA)
        
        # Set alpha channel based on mask
        roi_rgba[:, :, 3] = mask
        
        # Save as PNG
        output_path = output_dir / f"part_{idx:02d}.png"
        cv2.imwrite(str(output_path), roi_rgba)
        print(f"Saved part {idx}: {output_path} (size: {w}x{h})")
    
    print(f"\nDone! Saved {len(valid_contours)} parts to {output_dir}")

if __name__ == "__main__":
    image_path = "ellis-tomte.jpg"
    segment_objects(image_path)
