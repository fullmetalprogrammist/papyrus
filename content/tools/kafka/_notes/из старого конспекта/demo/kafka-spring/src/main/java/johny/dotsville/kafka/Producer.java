package johny.dotsville.kafka;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class Producer {

    private KafkaTemplate<String, String> kafka;

    @Autowired
    public Producer(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafka = kafkaTemplate;
    }

    public void send(String topic, String message) {
        kafka.send(topic, message);
    }

}