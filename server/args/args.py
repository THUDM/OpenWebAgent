from dataclasses import dataclass, field, asdict, fields
from typing import Optional, List, Dict, Any

@dataclass
class MongoArguments:
    base_url: Optional[str] = field(
        default="127.0.0.1:27017",
        metadata={"help": "The baseurl of server."}
    )
    username: Optional[str] = field(
        default="demo",
        metadata={"help": "The user of server."}
    )
    dbname: Optional[str] = field(
        default="web-assistant-demo",
        metadata={"help": "The name of database."}
    )

@dataclass
class PlannerArguments:
    provider: str = field(
        default="api",
        metadata={"help": "The provider of planner model."}
    )
    model: Optional[str] = field(
        default="gpt-3.5-turbo",
        metadata={"help": "The model to use for generating text."}
    )
    base_urls: Optional[list] = field(
        default=None,
        metadata={"help": "The baseurl of planner model."}
    )
    n_workers: int = field(
        default=1,
        metadata={"help": "The number of workers to use for parallel processing."}
    )
    do_sample: bool = field(
        default=True,
        metadata={"help": "Whether or not to use sampling, use greedy decoding otherwise."},
    )
    temperature: float = field(
        default=0.95,
        metadata={"help": "The value used to modulate the next token probabilities."},
    )
    top_p: float = field(
        default=0.7,
        metadata={
            "help": "The smallest set of most probable tokens with probabilities that add up to top_p or higher are kept."
        },
    )
    top_k: int = field(
        default=50,
        metadata={"help": "The number of highest probability vocabulary tokens to keep for top-k filtering."},
    )
    num_beams: int = field(
        default=1,
        metadata={"help": "Number of beams for beam search. 1 means no beam search."},
    )
    max_length: int = field(
        default=1024,
        metadata={"help": "The maximum length the generated tokens can have. It can be overridden by max_new_tokens."},
    )
    max_new_tokens: int = field(
        default=1024,
        metadata={"help": "The maximum numbers of tokens to generate, ignoring the number of tokens in the prompt."},
    )
    repetition_penalty: float = field(
        default=1.0,
        metadata={"help": "The parameter for repetition penalty. 1.0 means no penalty."},
    )
    length_penalty: float = field(
        default=1.0,
        metadata={"help": "Exponential penalty to the length that is used with beam-based generation."},
    )
    system_prompt: str = field(
        default="",
        metadata={"help": "The system prompt for planner model."}
    )
    
    def dict(self):
        return {k: str(v) for k, v in asdict(self).items()}
