from typing import List
from utils.utils import print_with_color
from models.llms import OpenAIModel, HttpModel

class APIModel(object):
    def __init__(self, provider: str, **kwargs):
        super().__init__()
        self.model = None
        self.model_name = None
        self.create_model(provider, **kwargs)
    
    def create_model(self, provider: str, **kwargs):
        self.model_name = provider
        # TODO: you can add your model here
        if provider == "openai":
            self.model = OpenAIModel(**kwargs)
        elif provider == "api":
            self.model = HttpModel(**kwargs)
        else:
            raise Exception(f"Unsupported model provider: {provider}")
            
    def inference(self, messages: List[str]) -> str:
        if not self.model:
            raise Exception(f"Model {self.model_name} not created.")
        
        print_with_color(f"generating with {self.model_name}...", color="green")
        result = self.model.generate(messages=messages)
        return result
    

if __name__ == '__main__':
    api_model = APIModel({"provider": "openai"})

    message = [{
        "role": "system",
        "content": [{"type": "text", "text": "You are chatgpt, a powerful generative AI."}]
    }, {
        "role": "user",
        "content": [{"type": "text", "text": "How are you?"}]
    }]
    
    print(api_model.inference(messages=message))