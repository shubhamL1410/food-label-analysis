package backend.food_lable_analysis.repository;

import backend.food_lable_analysis.model.AnalysisChat;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;

public interface AnalysisChatRepository extends MongoRepository<AnalysisChat, String> {

    List<AnalysisChat> findByUserIdOrderByCreatedAtDesc(String userId);

    long deleteByUserId(String userId);

    long deleteByUserIdIn(Collection<String> userIds);
}
