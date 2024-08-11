# OpenWebAgent - Server

## Getting started

1. Install required packages.

   ```shell
   bash setup.sh
   ```

2. Configure your MongoDB Atlas, you can also save the data locally, but remember to update `config/mongo_config.yaml` to the configuration you are using.

   ```yaml
   mongo_args:
     base_url: "<your-url>"
     dbname: "<your-db-name>"
     username: "<your-username>"
   ```

   

3. Set the model api key and database key in `config/server_config.yaml`, here is the a small sample for using gpt-4:

   ```yaml
   planner_args:
     provider: "openai"
     model: "gpt-4-turbo-2024-04-09"
     n_workers: 2
   ```

   If you want to use API for inference, you can setup like this:

   ```yaml
   planner_args:
     provider: "api"
     model: "url"
     base_urls: 
       - "http://<url-1>"
       - "http://<url-2>"
     # The following parameters are not important, but we recommend keeping them.
     do_sample: false
     temperature: 0.85
     top_p: 0.9
     top_k: 40
     num_beams: 4
     max_length: 512
     max_new_tokens: 512
     repetition_penalty: 1.2
     length_penalty: 1.0
   ```

4. Create `.env` in the root file with the following data:

   ```shell
   OPENAI_KEY="<your-token>"
   LOG_DB_PASSWD="<your-db-password>"
   OPENAI_API_URL="<your-openai-url>" # optional
   ```

5. Then, you can run the server:

   ```shell
   python agent/run_server.py
   ```


## Best Practice

If you want to deploy your own system with a different port configuration, you can:

1. Modify the api URL in `agent/run_server.py`

2. In the same file you can modify `controller_endpoint` to handle the data transfer from the front-end plugin (extension). 

   Here are the parameters that will be transferred from the frontend.

   ```yaml
   session_id:     for requests handling
   instructions:   user task
   html_text:      user context
   url:            current website url
   viewport_size:  viewport size of the browser
   image:          screenshot of the current website in base64 format
   ```

### APIs

If you want to use different LLMs/LMMs to inference, you should:

1. Set `provider` to "api" and `model` to "url"  in `config/server_config.yaml`.

2. Add your own model in the file `models/llms`, it is recommended to inherit `BaseModel` and modify the following functions.

   ```python
   from .base_model import BaseModel
   class YourModel(BaseModel):
       def __init__(self, **kwargs):
           super().__init__()
       def get_planner_prompt(...) -> str:
           pass # concat your prompt here!
       def generate(...) -> str:
           pass # call api
   ```

3. Don't forget to add your model in `models/api_model.py`

   ```python
   def create_model(self, provider: str, **kwargs):
       self.model_name = provider
       if provider == "openai":
           self.model = OpenAIModel(**kwargs)
       elif provider == "api":
           self.model = HttpModel(**kwargs)
       elif provider == "your-name"
           # TODO: you can add your model here
       else:
           raise Exception(f"Unsupported model provider: {provider}")
   ```

## Dump Record

Here's how to get the record corresponding to specific `session_id` from MongoDB.

1. First, you need to configure the basic information of MongoDB in the file `config/mongo_config.yaml`, and then fill in the database password `LOG_DB_PASSWD` in file `.env`.

2. Then, you can execute the following command to download the corresponding data.

   ```bash
   python -m database --session_id <session-id> --output_dir <output-dir>
   ```

   
