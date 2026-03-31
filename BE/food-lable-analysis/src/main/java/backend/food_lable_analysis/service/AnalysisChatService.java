package backend.food_lable_analysis.service;

import backend.food_lable_analysis.model.AnalysisChat;
import backend.food_lable_analysis.repository.AnalysisChatRepository;
import backend.food_lable_analysis.dto.AnalysisChatRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;

@Service
public class AnalysisChatService {

    @Autowired
    private AnalysisChatRepository repository;

    @Autowired
    private ImageService imageService;

    public AnalysisChat saveChat(String userId, AnalysisChatRequest request) throws IOException {
        String imageUrl = request.getImage();
        
        if (imageUrl != null && imageUrl.startsWith("data:image")) {
            imageUrl = imageService.saveImageFromBase64(imageUrl);
        }

        AnalysisChat chat = new AnalysisChat(
                userId,
                imageUrl,
                request.getType(),
                request.getModelPrediction(),
                request.getHealthScore(),
                request.getAnalyzeData(),
                request.getSuggestData(),
                hasText(request.getAnalyzeData()) || hasText(request.getSuggestData())
        );

        return repository.save(chat);
    }

    public List<AnalysisChat> getUserChats(String userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public java.util.Optional<AnalysisChat> getChatByIdAndUserId(String id, String userId) {
        return repository.findById(id)
                .filter(chat -> userId.equals(chat.getUserId()));
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
