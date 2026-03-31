package backend.food_lable_analysis.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.UUID;

@Service
public class ImageService {

    @Value("${app.images.path:}")
    private String imagesPath;

    public String saveImageFromBase64(String base64Data) throws IOException {
        if (base64Data == null || base64Data.isEmpty()) {
            throw new IllegalArgumentException("Image data is required");
        }

        String base64Image = base64Data;
        String mimeType = "";
        if (base64Image.contains(",")) {
            String[] parts = base64Image.split(",", 2);
            mimeType = parts[0];
            base64Image = parts[1];
        }

        byte[] imageBytes;
        try {
            imageBytes = Base64.getDecoder().decode(base64Image);
        } catch (IllegalArgumentException e) {
            throw new IOException("Invalid base64 image data: " + e.getMessage());
        }
        
        String extension = "jpg";
        if (mimeType.contains("png")) {
            extension = "png";
        } else if (mimeType.contains("jpeg") || mimeType.contains("jpg")) {
            extension = "jpg";
        } else if (mimeType.contains("webp")) {
            extension = "webp";
        }

        String filename = UUID.randomUUID().toString() + "." + extension;
        Path imagesDir;
        
        if (imagesPath != null && !imagesPath.isEmpty()) {
            imagesDir = Paths.get(imagesPath);
        } else {
            String projectRoot = System.getProperty("user.dir");
            imagesDir = Paths.get(projectRoot, "..", "FE", "FLA", "public", "images");
        }
        
        if (!Files.exists(imagesDir)) {
            Files.createDirectories(imagesDir);
        }

        Path filePath = imagesDir.resolve(filename);
        Files.write(filePath, imageBytes);

        return "/api/images/" + filename;
    }

    public Path getImagePath(String filename) {
        if (filename == null || filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            return null;
        }
        Path imagesDir;
        if (imagesPath != null && !imagesPath.isEmpty()) {
            imagesDir = Paths.get(imagesPath).toAbsolutePath().normalize();
        } else {
            String projectRoot = System.getProperty("user.dir");
            imagesDir = Paths.get(projectRoot, "..", "..", "FE", "FLA", "public", "images").toAbsolutePath().normalize();
        }
        Path resolved = imagesDir.resolve(filename).normalize();
        if (!resolved.startsWith(imagesDir)) {
            return null;
        }
        return resolved;
    }
}
