import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image as RNImage,
} from 'react-native';
import { Box, Text } from '@burma-inventory/ui-components';
import * as ImageManipulator from 'expo-image-manipulator';

// Safe dynamic imports for Skia to ensure 100% compilation on web platforms
let Canvas: any = null;
let SkiaImage: any = null;
let SkiaRect: any = null;
let useImage: any = null;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const skiaPkg = require('@shopify/react-native-skia');
    Canvas = skiaPkg.Canvas;
    SkiaImage = skiaPkg.Image;
    SkiaRect = skiaPkg.Rect;
    useImage = skiaPkg.useImage;
  } catch (err) {
    console.warn(
      '[Skia] Failed to dynamically load @shopify/react-native-skia:',
      err,
    );
  }
}

interface ImageAnnotationModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onAnnotated: (croppedUri: string) => void;
}

export function ImageAnnotationModal({
  visible,
  imageUri,
  onClose,
  onAnnotated,
}: ImageAnnotationModalProps) {
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [currentPoint, setCurrentPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [originalDimensions, setOriginalDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Load the image inside Skia if on mobile
  const skiaImageObject = useImage && imageUri ? useImage(imageUri) : null;

  // Retrieve original image size to scale the crop coordinates correctly
  useEffect(() => {
    if (imageUri) {
      RNImage.getSize(
        imageUri,
        (w, h) => {
          setOriginalDimensions({ width: w, height: h });
        },
        (err) => {
          console.warn('Failed to retrieve original image dimensions:', err);
        },
      );
    }
  }, [imageUri]);

  if (!imageUri) return null;

  const windowWidth = Dimensions.get('window').width;
  const canvasWidth = windowWidth - 40;
  const canvasHeight = 400;

  // Touch handlers to track box selection coordinates
  const handleTouchStart = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    setStartPoint({ x: locationX, y: locationY });
    setCurrentPoint({ x: locationX, y: locationY });
  };

  const handleTouchMove = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    setCurrentPoint({ x: locationX, y: locationY });
  };

  const handleTouchEnd = () => {
    // Keep final drawn coordinates
  };

  // Derive bounding box bounds
  let box: { x: number; y: number; width: number; height: number } | null =
    null;
  if (startPoint && currentPoint) {
    const x = Math.min(startPoint.x, currentPoint.x);
    const y = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(startPoint.x - currentPoint.x);
    const height = Math.abs(startPoint.y - currentPoint.y);
    box = { x, y, width, height };
  }

  const handleSave = async () => {
    if (!box || box.width < 10 || box.height < 10) {
      // If no box is drawn, return the original image
      onAnnotated(imageUri);
      return;
    }

    if (!originalDimensions) {
      console.warn(
        'Original dimensions not loaded yet, returning unmodified image',
      );
      onAnnotated(imageUri);
      return;
    }

    try {
      // Calculate scale factors
      const scaleX = originalDimensions.width / canvasWidth;
      const scaleY = originalDimensions.height / canvasHeight;

      const originX = Math.round(box.x * scaleX);
      const originY = Math.round(box.y * scaleY);
      const cropWidth = Math.round(box.width * scaleX);
      const cropHeight = Math.round(box.height * scaleY);

      // Enforce bounds checks
      const finalOriginX = Math.max(
        0,
        Math.min(originX, originalDimensions.width - 10),
      );
      const finalOriginY = Math.max(
        0,
        Math.min(originY, originalDimensions.height - 10),
      );
      const finalWidth = Math.min(
        cropWidth,
        originalDimensions.width - finalOriginX,
      );
      const finalHeight = Math.min(
        cropHeight,
        originalDimensions.height - finalOriginY,
      );

      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: finalOriginX,
              originY: finalOriginY,
              width: finalWidth,
              height: finalHeight,
            },
          },
        ],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );

      onAnnotated(manipResult.uri);
    } catch (err) {
      console.error('Failed to crop image:', err);
      onAnnotated(imageUri);
    }
  };

  const hasSkia = Canvas && SkiaImage && SkiaRect && skiaImageObject;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Box
        flex={1}
        bg="mainBackground"
        justifyContent="center"
        alignItems="center"
        p="m"
      >
        <Box
          bg="cardBackground"
          p="m"
          borderRadius="m"
          borderWidth={1}
          borderColor="borderColor"
          width="100%"
          maxWidth={500}
        >
          <Text variant="title" mb="s" textAlign="center">
            Crop & Annotate OCR Region
          </Text>
          <Text variant="bodySecondary" mb="m" textAlign="center">
            Drag to draw a bounding box highlighting the SKU grid/invoice.
          </Text>

          {/* Draw Container */}
          <Box
            style={{ width: canvasWidth, height: canvasHeight }}
            bg="secondaryBackground"
            borderRadius="m"
            overflow="hidden"
            borderWidth={1}
            borderColor="brandBorder"
          >
            {hasSkia ? (
              // Mobile Canvas using Shopify Skia
              <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
                <SkiaImage
                  image={skiaImageObject}
                  x={0}
                  y={0}
                  width={canvasWidth}
                  height={canvasHeight}
                  fit="contain"
                />
                {box && (
                  <SkiaRect
                    x={box.x}
                    y={box.y}
                    width={box.width}
                    height={box.height}
                    color="red"
                    style="stroke"
                    strokeWidth={3}
                  />
                )}
              </Canvas>
            ) : (
              // Web Fallback utilizing standard absolute view overlays
              <Box
                style={{
                  width: canvasWidth,
                  height: canvasHeight,
                  position: 'relative',
                }}
              >
                <RNImage
                  source={{ uri: imageUri }}
                  style={{ width: canvasWidth, height: canvasHeight }}
                  resizeMode="contain"
                />
                {box && (
                  <Box
                    style={{
                      position: 'absolute',
                      left: box.x,
                      top: box.y,
                      width: box.width,
                      height: box.height,
                      borderWidth: 3,
                      borderColor: 'red',
                      backgroundColor: 'rgba(255, 0, 0, 0.15)',
                    }}
                  />
                )}
              </Box>
            )}

            {/* Gesture overlay */}
            <Box
              style={StyleSheet.absoluteFill}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          </Box>

          <Box flexDirection="row" justifyContent="space-between" mt="m">
            <TouchableOpacity onPress={onClose}>
              <Box py="s" px="m" borderRadius="s" bg="secondaryButton">
                <Text variant="body" color="primaryText">
                  Cancel
                </Text>
              </Box>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave}>
              <Box py="s" px="m" borderRadius="s" bg="primaryButton">
                <Text variant="body" color="pureWhite">
                  Crop & Save
                </Text>
              </Box>
            </TouchableOpacity>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}
