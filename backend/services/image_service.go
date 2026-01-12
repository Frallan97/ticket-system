package services

import (
	"context"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"path/filepath"
	"strings"
	"time"

	"github.com/frallan97/ticket-system/backend/config"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var minioClient *minio.Client

// InitMinIO initializes the MinIO client and creates the bucket if it doesn't exist
func InitMinIO(cfg *config.Config) error {
	var err error
	minioClient, err = minio.New(cfg.MinioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinioAccessKey, cfg.MinioSecretKey, ""),
		Secure: cfg.MinioUseSSL,
	})
	if err != nil {
		return fmt.Errorf("failed to initialize MinIO client: %w", err)
	}

	// Create bucket if it doesn't exist
	ctx := context.Background()
	exists, err := minioClient.BucketExists(ctx, cfg.MinioBucket)
	if err != nil {
		return fmt.Errorf("failed to check bucket existence: %w", err)
	}

	if !exists {
		err = minioClient.MakeBucket(ctx, cfg.MinioBucket, minio.MakeBucketOptions{})
		if err != nil {
			return fmt.Errorf("failed to create bucket: %w", err)
		}
		log.Printf("Created MinIO bucket: %s", cfg.MinioBucket)

		// Set bucket policy to allow public read access for images
		policy := fmt.Sprintf(`{
			"Version": "2012-10-17",
			"Statement": [{
				"Effect": "Allow",
				"Principal": {"AWS": ["*"]},
				"Action": ["s3:GetObject"],
				"Resource": ["arn:aws:s3:::%s/*"]
			}]
		}`, cfg.MinioBucket)

		err = minioClient.SetBucketPolicy(ctx, cfg.MinioBucket, policy)
		if err != nil {
			log.Printf("Warning: failed to set bucket policy: %v", err)
		}
	}

	log.Printf("MinIO initialized successfully (endpoint: %s, bucket: %s)", cfg.MinioEndpoint, cfg.MinioBucket)
	return nil
}

// UploadEventImage uploads an event image to MinIO
func UploadEventImage(ctx context.Context, cfg *config.Config, file multipart.File, header *multipart.FileHeader) (string, error) {
	if minioClient == nil {
		return "", fmt.Errorf("MinIO client not initialized")
	}

	// Validate file type
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowedExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".webp": true,
		".gif":  true,
	}

	if !allowedExts[ext] {
		return "", fmt.Errorf("invalid file type: %s (allowed: jpg, jpeg, png, webp, gif)", ext)
	}

	// Validate file size (max 5MB)
	if header.Size > 5*1024*1024 {
		return "", fmt.Errorf("file too large: %d bytes (max 5MB)", header.Size)
	}

	// Generate unique filename
	uniqueID := uuid.New().String()
	objectName := fmt.Sprintf("events/%s%s", uniqueID, ext)

	// Determine content type
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// Upload to MinIO
	_, err := minioClient.PutObject(ctx, cfg.MinioBucket, objectName, file, header.Size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload image: %w", err)
	}

	// Generate public URL
	imageURL := fmt.Sprintf("http://%s/%s/%s", cfg.MinioEndpoint, cfg.MinioBucket, objectName)

	log.Printf("Uploaded image: %s (%d bytes)", objectName, header.Size)
	return imageURL, nil
}

// DeleteEventImage deletes an event image from MinIO
func DeleteEventImage(ctx context.Context, cfg *config.Config, imageURL string) error {
	if minioClient == nil {
		return fmt.Errorf("MinIO client not initialized")
	}

	if imageURL == "" {
		return nil // Nothing to delete
	}

	// Extract object name from URL
	// URL format: http://minio:9000/event-images/events/uuid.jpg
	parts := strings.Split(imageURL, "/")
	if len(parts) < 2 {
		return fmt.Errorf("invalid image URL format")
	}

	// Get the last two parts (events/uuid.jpg)
	objectName := strings.Join(parts[len(parts)-2:], "/")

	// Delete from MinIO
	err := minioClient.RemoveObject(ctx, cfg.MinioBucket, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete image: %w", err)
	}

	log.Printf("Deleted image: %s", objectName)
	return nil
}

// GetImageURL generates a presigned URL for an image (if needed for private images)
func GetImageURL(ctx context.Context, cfg *config.Config, objectName string, expiry time.Duration) (string, error) {
	if minioClient == nil {
		return "", fmt.Errorf("MinIO client not initialized")
	}

	// Generate presigned URL
	url, err := minioClient.PresignedGetObject(ctx, cfg.MinioBucket, objectName, expiry, nil)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return url.String(), nil
}

// StreamImage streams an image from MinIO (useful for proxying)
func StreamImage(ctx context.Context, cfg *config.Config, objectName string) (io.ReadCloser, int64, string, error) {
	if minioClient == nil {
		return nil, 0, "", fmt.Errorf("MinIO client not initialized")
	}

	// Get object
	object, err := minioClient.GetObject(ctx, cfg.MinioBucket, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, 0, "", fmt.Errorf("failed to get image: %w", err)
	}

	// Get object info for size and content type
	stat, err := object.Stat()
	if err != nil {
		object.Close()
		return nil, 0, "", fmt.Errorf("failed to get image info: %w", err)
	}

	return object, stat.Size, stat.ContentType, nil
}
