package backend.food_lable_analysis.dto;

public class AnalysisChatRequest {

    private String image;
    private String type;
    private String modelPrediction;
    private Integer healthScore;
    private String analyzeData;
    private String suggestData;
    
	public AnalysisChatRequest() {
		super();
	}
	public AnalysisChatRequest(String image, String type, String modelPrediction, Integer healthScore, String analyzeData, String suggestData) {
		super();
		this.image = image;
		this.type = type;
		this.modelPrediction = modelPrediction;
		this.healthScore = healthScore;
		this.analyzeData = analyzeData;
		this.suggestData = suggestData;
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
}
