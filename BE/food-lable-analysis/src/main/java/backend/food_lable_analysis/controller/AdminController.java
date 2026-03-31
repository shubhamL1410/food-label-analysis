package backend.food_lable_analysis.controller;

import backend.food_lable_analysis.dto.AdminUserView;
import backend.food_lable_analysis.model.AdminDashboardStats;
import backend.food_lable_analysis.model.AnalysisChat;
import backend.food_lable_analysis.model.AnalysisHistory;
import backend.food_lable_analysis.service.AdminService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/stats")
    public AdminDashboardStats getStats(Authentication authentication) {
        ensureAdmin(authentication);
        return adminService.getStats();
    }

    @GetMapping("/users")
    public List<AdminUserView> getUsers(Authentication authentication) {
        ensureAdmin(authentication);
        return adminService.getAllUsers();
    }

    @DeleteMapping("/users/{userId}")
    public void deleteUser(@PathVariable String userId, Authentication authentication) {
        ensureAdmin(authentication);
        try {
            boolean deleted = adminService.deleteUserAndData(userId);
            if (!deleted) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
            }
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @GetMapping("/chats")
    public List<AnalysisChat> getChats(Authentication authentication) {
        ensureAdmin(authentication);
        return adminService.getAllChats();
    }

    @DeleteMapping("/chats/{chatId}")
    public void deleteChat(@PathVariable String chatId, Authentication authentication) {
        ensureAdmin(authentication);
        boolean deleted = adminService.deleteChat(chatId);
        if (!deleted) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat record not found");
        }
    }

    @GetMapping("/history")
    public List<AnalysisHistory> getHistory(Authentication authentication) {
        ensureAdmin(authentication);
        return adminService.getAllHistory();
    }

    @DeleteMapping("/history/{historyId}")
    public void deleteHistory(@PathVariable String historyId, Authentication authentication) {
        ensureAdmin(authentication);
        boolean deleted = adminService.deleteHistory(historyId);
        if (!deleted) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Analysis record not found");
        }
    }

    private void ensureAdmin(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        try {
            adminService.assertAdmin(authentication.getName());
        } catch (AccessDeniedException ex) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ex.getMessage());
        }
    }
}
