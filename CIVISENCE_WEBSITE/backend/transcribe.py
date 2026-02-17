# backend/transcribe.py
import sys
from faster_whisper import WhisperModel

model = WhisperModel("base", compute_type="int8", device="cpu")

if len(sys.argv) < 2:
    print("No audio file path provided.")
    sys.exit(1)

audio_path = sys.argv[1]

segments, info = model.transcribe(audio_path)

output = ""
for segment in segments:
    output += f"{segment.text} "

print(output.strip())
