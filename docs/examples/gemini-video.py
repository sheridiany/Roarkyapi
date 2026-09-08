#!/usr/bin/env python3
"""Analyze a small complete MP4 through Roark API, without a file upload endpoint."""

import argparse
import base64
import json
import os
from pathlib import Path
import urllib.error
import urllib.request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('video', type=Path)
parser.add_argument('--model', default='gemini-3.8-flash')
parser.add_argument('--protocol', choices=['chat', 'gemini'], default='chat')
args = parser.parse_args()
key = os.environ.get('ROARK_API_KEY')
if not key:
    parser.error('Set ROARK_API_KEY to your Roark API token (Gemini group).')
if args.video.stat().st_size > 14 * 1024 * 1024:
    parser.error('This inline example is limited to MP4 files under 14 MiB.')
video = base64.b64encode(args.video.read_bytes()).decode('ascii')
prompt = (
    'Analyze the attached video in chronological order. Describe the visible '
    'scenes and transcribe the speech. Quote any visible text and numbers exactly. '
    'If any content is unavailable, say so instead of inventing it.'
)
base_url = os.environ.get('ROARK_BASE_URL', 'https://api.roarkist.com').rstrip('/')
if args.protocol == 'chat':
    path = '/v1/chat/completions'
    body = {
        'model': args.model,
        'messages': [{'role': 'user', 'content': [
            {'type': 'text', 'text': prompt},
            {'type': 'video_url', 'video_url': 'data:video/mp4;base64,' + video},
        ]}],
        'max_tokens': 4096,
        'temperature': 0,
        'stream': False,
    }
else:
    path = '/v1beta/models/' + args.model + ':generateContent'
    body = {
        'contents': [{'role': 'user', 'parts': [
            {'text': prompt},
            {'inlineData': {'mimeType': 'video/mp4', 'data': video}},
        ]}],
        'generationConfig': {'maxOutputTokens': 4096, 'temperature': 0},
    }
request = urllib.request.Request(
    base_url + path,
    data=json.dumps(body).encode('utf-8'),
    headers={
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'User-Agent': 'RoarkVideoExample/1.0',
    },
    method='POST',
)
try:
    with urllib.request.urlopen(request, timeout=180) as response:
        result = json.load(response)
except urllib.error.HTTPError as error:
    raise SystemExit(f'HTTP {error.code}: {error.read().decode("utf-8", errors="replace")}')
print(json.dumps(result, ensure_ascii=False, indent=2))
