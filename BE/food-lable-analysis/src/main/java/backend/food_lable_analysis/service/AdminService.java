package backend.food_lable_analysis.service;

import backend.food_lable_analysis.dto.AdminUserView;
import backend.food_lable_analysis.model.AdminDashboardStats;
import backend.food_lable_analysis.model.AnalysisChat;
import backend.food_lable_analysis.model.AnalysisHistory;
import backend.food_lable_analysis.model.User;
import backend.food_lable_analysis.repository.AnalysisChatRepository;
import backend.food_lable_analysis.repository.AnalysisHistoryRepository;
import backend.food_lable_analysis.repository.IUserRepo;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class AdminService {

    private final IUserRepo userRepo;
    private final AnalysisChatRepository chatRepo;
    private final AnalysisHistoryRepository historyRepo;

    public AdminService(IUserRepo userRepo,
                        AnalysisChatRepository chatRepo,
                        AnalysisHistoryRepository historyRepo) {
        this.userRepo = userRepo;
        this.chatRepo = chatRepo;
        this.historyRepo = historyRepo;
    }

    public void assertAdmin(String usernameOrEmail) {
        User user = resolveUser(usernameOrEmail)
                .orElseThrow(() -> new AccessDeniedException("Unauthorized user"));
        String role = user.getRole() == null ? "USER" : user.getRole().toUpperCase();
        if (!"ADMIN".equals(role)) {
            throw new AccessDeniedException("Admin access required");
        }
    }

    public AdminDashboardStats getStats() {
        return new AdminDashboardStats(
                userRepo.count(),
                historyRepo.count(),
                chatRepo.count()
        );
    }

    public List<AdminUserView> getAllUsers() {
        return userRepo.findAll(Sort.by(Sort.Direction.DESC, "id"))
                .stream()
                .map(this::toAdminUserView)
                .toList();
    }

    public List<AnalysisChat> getAllChats() {
        return chatRepo.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    public List<AnalysisHistory> getAllHistory() {
        return historyRepo.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    public boolean deleteUserAndData(String userId) {
        Optional<User> found = userRepo.findById(userId);
        if (found.isEmpty()) {
            return false;
        }

        User user = found.get();
        String role = user.getRole() == null ? "USER" : user.getRole().toUpperCase();
        if ("ADMIN".equals(role)) {
            throw new IllegalArgumentException("Admin user cannot be deleted");
        }

        Set<String> ownerKeys = Set.of(user.getUsername(), user.getGmail());
        chatRepo.deleteByUserIdIn(ownerKeys);
        historyRepo.deleteByUserIdIn(ownerKeys);
        userRepo.deleteById(userId);
        return true;
    }

    public boolean deleteChat(String chatId) {
        if (!chatRepo.existsById(chatId)) {
            return false;
        }
        chatRepo.deleteById(chatId);
        return true;
    }

    public boolean deleteHistory(String historyId) {
        if (!historyRepo.existsById(historyId)) {
            return false;
        }
        historyRepo.deleteById(historyId);
        return true;
    }

    private Optional<User> resolveUser(String usernameOrEmail) {
        return userRepo.findByUsername(usernameOrEmail)
                .or(() -> userRepo.findByGmail(usernameOrEmail));
    }

    private AdminUserView toAdminUserView(User user) {
        AdminUserView dto = new AdminUserView();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setGmail(user.getGmail());
        dto.setHeight(user.getHeight());
        dto.setWeight(user.getWeight());
        dto.setBirthDate(user.getBirthDate());
        dto.setVerified(user.isVerified());
        dto.setRole(user.getRole() == null ? "USER" : user.getRole().toUpperCase());
        return dto;
    }
}
