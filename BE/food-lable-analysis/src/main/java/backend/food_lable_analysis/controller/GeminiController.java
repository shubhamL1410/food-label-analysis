//package backend.food_lable_analysis.controller;
//
//import backend.food_lable_analysis.service.GeminiService;
//
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.web.bind.annotation.GetMapping;
//import org.springframework.web.bind.annotation.RequestParam;
//import org.springframework.web.bind.annotation.RequestMapping;
//import org.springframework.web.bind.annotation.RestController;
//
//@RestController
//@RequestMapping("/api/gemini")
//public class GeminiController {
//
//    @Autowired
//    private GeminiService geminiService;
//
//    @GetMapping("/ask")
//    public String askGemini(@RequestParam String prompt) throws Exception {
//        return geminiService.generateResponse(prompt);
//    }
//}
