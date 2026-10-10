# 📥 Social Downloader — Universal High-Speed Media Downloader for Mobile

<div align="center">

[![Expo SDK](https://img.shields.io/badge/Expo-Mobile%20Suite-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.76%2B-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-success?style=for-the-badge&logo=android&logoColor=white)](https://expo.dev/)
[![Media Engine](https://img.shields.io/badge/Media-StorageAccessFramework-FF6B6B?style=for-the-badge&logo=files&logoColor=white)](https://docs.expo.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

### **Universal HD Video, Audio & Photo Downloader for Social Media Platforms**
*Download watermark-free videos and high-bitrate audio from TikTok, Instagram Reels, Facebook, YouTube, and X directly to your phone's photo gallery.*

</div>

---

## 🌟 Overview

**Social Downloader** is a clean, multi-platform media downloader mobile application developed with **React Native** and **Expo**.

It eliminates the hassle of screen recordings and low-quality watermarks by extracting direct high-definition media streams across all major social networks. Featuring one-tap clipboard link pasting, built-in in-app video playback, native Android `StorageAccessFramework` album organization, and adaptive dark/light themes, Social Downloader offers an effortless offline saving experience.

---

## ✨ Key Features

### 🎬 Universal Multi-Platform Extraction
* **TikTok**: Download HD videos with **zero watermarks** and extract background audio MP3s.
* **Instagram**: Download Reels, Carousel photo albums, Stories, and IGTV clips.
* **Facebook & YouTube**: Extract 1080p video streams and uncompressed audio tracks.
* **Twitter / X**: Instant MP4 downloads from posts and threads.

### 📱 Streamlined Mobile Experience
* **Auto-Paste Clipboard Integration**: One-tap link retrieval directly from your device clipboard (`ClipboardPaste`).
* **Direct Gallery Synchronization**: Automatically organizes downloads into a dedicated "Social Downloader" phone album using `expo-media-library` and `StorageAccessFramework`.
* **In-App Media Player**: Inspect and play downloaded videos immediately before sharing or moving.
* **Adaptive Light & Dark Themes**: Toggle seamlessly between vibrant day styling and sleek OLED dark mode.

---

## 🏗️ Architecture & Storage Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                 React Native User Interface                 │
│         (Tab Views • Lucide Native Icons • Dual Themes)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ User Link / Clipboard
┌──────────────────────────────▼──────────────────────────────┐
│                  Media Resolution Engine                    │
│      (Auto-detection • RapidAPI Autolink REST Endpoint)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Direct HD Video Stream URL
┌──────────────────────────────▼──────────────────────────────┐
│                 FileSystem Download Manager                 │
│          (Async Chunk Download • Filename Sanitizer)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Local Cache File
┌──────────────────────────────▼──────────────────────────────┐
│                 Native Gallery Organization                 │
│  (StorageAccessFramework • MediaLibrary Dedicated Album)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### 1. Prerequisites
* **Node.js**: `18.x` or higher installed.
* **Smartphone**: Android or iOS device with the **Expo Go** app installed.

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/dilshan916/social-downloader.git
cd social-downloader

# Install dependencies
npm install
```

### 3. Running with Expo Go

```bash
# Start the Expo development server
npx expo start
```

1. Open **Expo Go** on your Android smartphone or Camera on iOS.
2. Scan the terminal QR code to launch the application.

---

## 📦 Compiling Standalone APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo Application Services
eas login

# Build standalone Android APK
eas build -p android --profile preview
```

---

## 📄 License & Credits

This project is licensed under the **MIT License**.

### Developed & Maintained by
* **Dilshan Chandrarathne** ([@dilshan916](https://github.com/dilshan916))
