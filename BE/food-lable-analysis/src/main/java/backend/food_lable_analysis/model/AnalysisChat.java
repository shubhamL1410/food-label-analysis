package backend.food_lable_analysis.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "analysis_chats")
public class AnalysisChat {

    @Id
    private String id;

    private String userId;          

    private String image;           

    private String type;            

    private String modelPrediction; 
    
    private Integer healthScore;    

    private String analyzeData;     

    private String suggestData;     
    
    private Boolean geminiCalled;   

    private LocalDateTime createdAt;

    public AnalysisChat() {}

    public AnalysisChat(String userId, String image, String type,
                        String modelPrediction, Integer healthScore, String analyzeData, String suggestData,
                        Boolean geminiCalled) {
        this.userId = userId;
        this.image = image;
        this.type = type;
        this.modelPrediction = modelPrediction;
        this.healthScore = healthScore;
        this.analyzeData = analyzeData;
        this.suggestData = suggestData;
        this.geminiCalled = geminiCalled;
        this.createdAt = LocalDateTime.now();
    }

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

	public String getImage() {
		return image;
	}

	public void setImage(String image) {
		this.image = image;
	}

	public String getType() {
		return type;
	}

	public void setType(String type) {
		this.type = type;
	}

	public String getAnalyzeData() {
		return analyzeData;
	}

	public void setAnalyzeData(String analyzeData) {
		this.analyzeData = analyzeData;
	}

	public String getSuggestData() {
		return suggestData;
	}

	public void setSuggestData(String suggestData) {
		this.suggestData = suggestData;
	}

    public Boolean getGeminiCalled() {
        return geminiCalled;
    }

    public void setGeminiCalled(Boolean geminiCalled) {
        this.geminiCalled = geminiCalled;
    }

	public String getModelPrediction() {
		return modelPrediction;
	}

	public void setModelPrediction(String modelPrediction) {
		this.modelPrediction = modelPrediction;
	}

    public Integer getHealthScore() {
        return healthScore;
    }

    public void setHealthScore(Integer healthScore) {
        this.healthScore = healthScore;
    }

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}
}
