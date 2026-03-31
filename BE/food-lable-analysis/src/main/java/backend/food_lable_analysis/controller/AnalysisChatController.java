package backend.food_lable_analysis.controller;

import backend.food_lable_analysis.dto.AnalysisChatRequest;
import backend.food_lable_analysis.model.AnalysisChat;
import backend.food_lable_analysis.service.AnalysisChatService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class AnalysisChatController {

    @Autowired
    private AnalysisChatService service;


    @PostMapping("/save")
    public AnalysisChat saveChat(@RequestBody AnalysisChatRequest request,
                                 Authentication authentication) {
        try {
            if (request == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
            }
            if (request.getImage() == null || request.getImage().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image is required");
            }
            if (request.getType() == null || request.getType().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type is required");
            }
            
            String userId = authentication.getName();
            System.out.println("Saving chat for user: " + userId + ", type: " + request.getType() + 
                             ", image length: " + (request.getImage() != null ? request.getImage().length() : 0) +
                             ", has modelPrediction: " + (request.getModelPrediction() != null));
            
            return service.saveChat(userId, request);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (IllegalArgumentException e) {
            e.printStackTrace();
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid request: " + e.getMessage());
        } catch (IOException e) {
            e.printStackTrace();
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to save image: " + e.getMessage()
            );
        } catch (Exception e) {
            e.printStackTrace();
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to save chat: " + e.getMessage()
            );
        }
    }


    @GetMapping("/")
    public List<AnalysisChat> getMyChats(Authentication authentication) {
        String userId = authentication.getName();
        return service.getUserChats(userId);
    }

    @GetMapping("/{id}")
    public AnalysisChat getChatById(@PathVariable String id, Authentication authentication) {
        String userId = authentication.getName();
        return service.getChatByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chat not found"));
    }
}
