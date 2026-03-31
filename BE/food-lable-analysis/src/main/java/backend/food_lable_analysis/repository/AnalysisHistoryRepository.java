package backend.food_lable_analysis.repository;

import backend.food_lable_analysis.model.AnalysisHistory;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;

public interface AnalysisHistoryRepository extends MongoRepository<AnalysisHistory, String> {

    List<AnalysisHistory> findByUserIdOrderByCreatedAtDesc(String userId);

    long deleteByUserId(String userId);

    long deleteByUserIdIn(Collection<String> userIds);
}
