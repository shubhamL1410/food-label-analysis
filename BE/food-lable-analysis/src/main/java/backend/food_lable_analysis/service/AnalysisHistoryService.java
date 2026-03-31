package backend.food_lable_analysis.service;

import backend.food_lable_analysis.model.AnalysisHistory;
import backend.food_lable_analysis.repository.AnalysisHistoryRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AnalysisHistoryService {

    private final AnalysisHistoryRepository repository;

    public AnalysisHistoryService(AnalysisHistoryRepository repository) {
        this.repository = repository;
    }

    public AnalysisHistory save(String userId, String extractedLabel, String labelType,
                                Integer healthScore, String geminiAnalysis, String suggestion) {
        AnalysisHistory record = new AnalysisHistory();
        record.setUserId(userId);
        record.setExtractedLabel(extractedLabel);
        record.setLabelType(labelType != null ? labelType : "nutrition");
        record.setHealthScore(healthScore);
        record.setGeminiAnalysis(geminiAnalysis);
        record.setSuggestion(suggestion);
        return repository.save(record);
    }

    public Optional<AnalysisHistory> updateSuggestion(String id, String userId, String suggestion) {
        Optional<AnalysisHistory> opt = repository.findById(id);
        if (opt.isEmpty() || !userId.equals(opt.get().getUserId())) {
            return Optional.empty();
        }
        AnalysisHistory record = opt.get();
        record.setSuggestion(suggestion);
        return Optional.of(repository.save(record));
    }

    public List<AnalysisHistory> findByUserId(String userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}
