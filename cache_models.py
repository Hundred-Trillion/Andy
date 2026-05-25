#!/usr/bin/env python3
"""
ANDY v1 - HuggingFace Model Pre-cacher

Run this script ONCE while connected to the internet.
It will download the sentence-transformers model weights to your local machine
(~80MB) so that the RAG pipeline can function completely offline.
"""

import os
from sentence_transformers import SentenceTransformer

def main():
    model_name = "all-MiniLM-L6-v2"
    print(f"Downloading {model_name} from HuggingFace...")
    
    # This automatically downloads and caches the model to ~/.cache/huggingface/
    model = SentenceTransformer(model_name)
    
    print("==================================================")
    print("SUCCESS: Model downloaded and cached locally!")
    print(f"Location: ~/.cache/huggingface/hub/models--sentence-transformers--{model_name}")
    print("You are now safe to run the RAG backend offline.")
    print("==================================================")

if __name__ == "__main__":
    main()
