package backend.food_lable_analysis.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "analysis_history")
public class AnalysisHistory {

    @Id
    private String id;

    private String userId;
    private String extractedLabel;
    private String labelType;
    private Integer healthScore;
    private String geminiAnalysis;
    private String suggestion;
    private Instant createdAt = Instant.now();

    public AnalysisHistory() {}

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getExtractedLabel() {
        return extractedLabel;
    }

    public void setExtractedLabel(String extractedLabel) {
        this.extractedLabel = extractedLabel;
    }

    public String getLabelType() {
        return labelType;
    }

    public void setLabelType(String labelType) {
        this.labelType = labelType;
    }

    public String getGeminiAnalysis() {
        return geminiAnalysis;
    }

    public void setGeminiAnalysis(String geminiAnalysis) {
        this.geminiAnalysis = geminiAnalysis;
    }

    public String getSuggestion() {
        return suggestion;
    }

    public void setSuggestion(String suggestion) {
        this.suggestion = suggestion;
    }

    public Integer getHealthScore() {
        return healthScore;
    }

    public void setHealthScore(Integer healthScore) {
        this.healthScore = healthScore;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
