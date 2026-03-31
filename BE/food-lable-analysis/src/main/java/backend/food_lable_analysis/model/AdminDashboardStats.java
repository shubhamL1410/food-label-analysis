package backend.food_lable_analysis.model;

public class AdminDashboardStats {
    private long totalUsers;
    private long totalFoodAnalyses;
    private long totalStoredChats;

    public AdminDashboardStats() {}

    public AdminDashboardStats(long totalUsers, long totalFoodAnalyses, long totalStoredChats) {
        this.totalUsers = totalUsers;
        this.totalFoodAnalyses = totalFoodAnalyses;
        this.totalStoredChats = totalStoredChats;
    }

    public long getTotalUsers() {
        return totalUsers;
    }

    public void setTotalUsers(long totalUsers) {
        this.totalUsers = totalUsers;
    }

    public long getTotalFoodAnalyses() {
        return totalFoodAnalyses;
    }

    public void setTotalFoodAnalyses(long totalFoodAnalyses) {
        this.totalFoodAnalyses = totalFoodAnalyses;
    }

    public long getTotalStoredChats() {
        return totalStoredChats;
    }

    public void setTotalStoredChats(long totalStoredChats) {
        this.totalStoredChats = totalStoredChats;
    }
}
