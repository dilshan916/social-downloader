import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  useWindowDimensions,
  FlatList,
  Alert,
  ActivityIndicator
} from 'react-native';
import { ClipboardPaste, Download, PlayCircle, Sun, Moon, Image as ImageIcon, Video, FolderOpen } from 'lucide-react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import * as FileSystem from 'expo-file-system/legacy';
const { StorageAccessFramework } = FileSystem;
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';

// -------- Themes --------
const lightTheme = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  primary: '#4F46E5', // Indigo
};

const darkTheme = {
  background: '#0F1115',
  surface: '#1A1D24',
  text: '#F3F4F6',
  textMuted: '#9CA3AF',
  border: '#2A2E37',
  primary: '#6366F1', // Indigo soft
};

// -------- Helper Functions --------
const sanitizeFilename = (name) => {
  if (!name) return `SocialMedia_Download_${Date.now()}`;
  // Remove invalid characters for file systems and limit length
  return name.replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 100).trim();
};

const saveToSpecificAlbum = async (localUri, albumName = 'Social Downloader') => {
  try {
    // Request full access (read/write) because getAlbumAsync requires read permission
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error("Missing MEDIA_LIBRARY permissions.");
    }

    const asset = await MediaLibrary.createAssetAsync(localUri);
    try {
      const album = await MediaLibrary.getAlbumAsync(albumName);
      if (album == null) {
        await MediaLibrary.createAlbumAsync(albumName, asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }
    } catch (albumError) {
      console.warn("Album creation restricted, saved to default gallery instead.", albumError);
    }
  } catch (error) {
    console.error("Error creating asset or album:", error);
    throw new Error("Failed to create media asset. " + error.message);
  }
};

// -------- Social Downloader Tab --------
const DownloaderRoute = ({ theme }) => {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('Video'); // 'Video' or 'Audio'
  const [quality, setQuality] = useState('1080'); // '360', '720', '1080', 'Max'
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [previewData, setPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const downloadResumableRef = useRef(null);

  useEffect(() => {
    if (!url) {
      setPreviewData(null);
      return;
    }

    // Slight debounce for auto-fetching preview
    const timeoutId = setTimeout(() => {
      fetchPreviewInfo(url);
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [url]);

  const fetchPreviewInfo = async (link) => {
    setIsLoadingPreview(true);
    setPreviewData(null);
    try {
      const options = {
        method: 'POST',
        headers: {
          'x-rapidapi-key': 'aa23195c40mshdfe8aee23ba8689p1da287jsn9a9a08179521',
          'x-rapidapi-host': 'social-download-all-in-one.p.rapidapi.com',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: link })
      };
      const response = await fetch('https://social-download-all-in-one.p.rapidapi.com/v1/social/autolink', options);
      const data = await response.json();

      let title = data.title || data.desc || data.text || 'Detected Media';
      let thumbnail = data.thumbnail || data.cover || data.picture;

      setPreviewData({ title, thumbnail });
    } catch (err) {
      // console.log('Preview fetch error:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handlePaste = async () => {
    // Optionally implement expo-clipboard here in the future
    Alert.alert('Tip', 'Please use the text input field to paste your link directly.');
  };

  const cancelDownload = async () => {
    if (downloadResumableRef.current) {
      await downloadResumableRef.current.cancelAsync();
      setIsDownloading(false);
      setDownloadProgress(0);
      alert('Download Cancelled');
    }
  };

  const handleDownload = async () => {
    if (!url) {
      alert("Please enter a valid URL");
      return;
    }
    const isAudio = format === 'Audio';
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      if (Platform.OS !== 'web') {
        const { status } = await MediaLibrary.requestPermissionsAsync(true);
        if (status !== 'granted') {
          alert('Permission needed to save videos to your gallery!');
          setIsDownloading(false);
          return;
        }
      }

      alert('Processing link... Please wait.');
      const options = {
        method: 'POST',
        headers: {
          'x-rapidapi-key': 'aa23195c40mshdfe8aee23ba8689p1da287jsn9a9a08179521',
          'x-rapidapi-host': 'social-download-all-in-one.p.rapidapi.com',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url })
      };
      const response = await fetch('https://social-download-all-in-one.p.rapidapi.com/v1/social/autolink', options);
      const data = await response.json();

      let rawTitle = data.title || data.desc || data.text || 'Social_Download';

      let mediaUrl = null;
      // Smart URL extraction based on common RapidAPI structures
      if (data.medias && data.medias.length > 0) {
        mediaUrl = data.medias[0].url;
      } else if (data.url) {
        mediaUrl = data.url;
      } else if (data.video) {
        mediaUrl = data.video;
      }
      if (!mediaUrl) {
        throw new Error("Could not extract media link. Check console for API response.");
      }
      if (Platform.OS === 'web') {
        window.open(mediaUrl, '_blank');
      } else {
        const safeTitle = sanitizeFilename(rawTitle);
        const fileExt = isAudio ? '.mp3' : '.mp4';
        const fileUri = FileSystem.documentDirectory + safeTitle + fileExt;

        const downloadCallback = downloadProgress => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
        };

        downloadResumableRef.current = FileSystem.createDownloadResumable(
          mediaUrl,
          fileUri,
          {},
          downloadCallback
        );

        const { uri } = await downloadResumableRef.current.downloadAsync();

        await saveToSpecificAlbum(uri);
        alert('Success! Saved to gallery.');
      }
    } catch (error) {
      // console.error("Download Error:", error);
      alert('Error: ' + error.message);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.background }]}>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Download videos easily from your favorite social media platforms.
      </Text>

      {/* Input Section */}
      <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Paste video URL here..."
          placeholderTextColor={theme.textMuted}
          value={url}
          onChangeText={setUrl}
        />
        <TouchableOpacity style={styles.pasteButton} onPress={handlePaste}>
          <ClipboardPaste color={theme.primary} size={20} />
          <Text style={[styles.pasteText, { color: theme.primary }]}>Paste</Text>
        </TouchableOpacity>
      </View>

      {/* Format Selection */}
      <View style={styles.optionsSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Format</Text>
        <View style={[styles.segmentedControl, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {['Video', 'Audio'].map((fmt) => (
            <TouchableOpacity
              key={fmt}
              style={[
                styles.segmentButton,
                format === fmt && { backgroundColor: theme.primary }
              ]}
              onPress={() => setFormat(fmt)}
            >
              <Text style={[
                styles.segmentText,
                { color: format === fmt ? '#fff' : theme.textMuted }
              ]}>{fmt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quality Selection */}
      {format === 'Video' && (
        <View style={styles.optionsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quality</Text>
          <View style={styles.qualityRow}>
            {['360', '720', '1080', 'Max'].map((q) => (
              <TouchableOpacity
                key={q}
                style={[
                  styles.qualityButton,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  quality === q && { backgroundColor: theme.primary, borderColor: theme.primary }
                ]}
                onPress={() => setQuality(q)}
              >
                <Text style={[
                  styles.qualityText,
                  { color: quality === q ? '#fff' : theme.textMuted }
                ]}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.downloadButton, { backgroundColor: theme.primary }, isDownloading && { opacity: 0.7 }, isDownloading && { marginBottom: 10 }]}
        onPress={handleDownload}
        disabled={isDownloading}
      >
        <Download color="#ffffff" size={24} style={styles.buttonIcon} />
        <Text style={styles.downloadButtonText}>
          {isDownloading ? 'Downloading...' : 'Download'}
        </Text>
      </TouchableOpacity>

      {isDownloading && (
        <View style={{ marginBottom: 30 }}>
          <View style={{ height: 12, backgroundColor: theme.surface, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
            <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, downloadProgress * 100))}%`, backgroundColor: theme.primary }} />
          </View>
          <Text style={{ textAlign: 'center', marginTop: 8, color: theme.textMuted, fontWeight: '600' }}>
            {Math.round(downloadProgress * 100)}%
          </Text>
          <TouchableOpacity
            style={{ marginTop: 12, backgroundColor: '#EF4444', padding: 14, borderRadius: 12, alignItems: 'center' }}
            onPress={cancelDownload}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Cancel Download</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Settings Section */}
      <View style={styles.previewSection}>
        <Text style={[styles.previewSectionTitle, { color: theme.text }]}>Selected Format Settings</Text>

        {isLoadingPreview ? (
          <View style={[styles.emptyPreview, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.emptyPreviewText, { color: theme.textMuted, marginTop: 12 }]}>
              Loading preview...
            </Text>
          </View>
        ) : previewData ? (
          <View style={[styles.previewCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {previewData.thumbnail ? (
              <Image
                source={{ uri: previewData.thumbnail }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.background, alignSelf: 'center', marginVertical: 20 }]}>
                <ImageIcon color={theme.primary} size={32} />
              </View>
            )}
            {format === 'Video' ? (
              <View style={styles.playOverlay}>
                <PlayCircle color="#ffffff" size={48} />
              </View>
            ) : null}
            <View style={styles.previewInfo}>
              <Text style={[styles.videoTitle, { color: theme.text }]} numberOfLines={2}>
                {previewData.title}
              </Text>
              <Text style={[styles.videoDetails, { color: theme.textMuted }]}>
                {format === 'Video' ? `Result: MP4 • ${quality === 'Max' ? 'Max Quality' : `${quality}p`}` : 'Result: MP3 Audio Format'}
              </Text>
            </View>
          </View>
        ) : url ? (
          <View style={[styles.emptyPreview, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.emptyPreviewText, { color: theme.textMuted }]}>
              Processing link...
            </Text>
          </View>
        ) : (
          <View style={[styles.emptyPreview, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.emptyIconContainer, { backgroundColor: theme.background }]}>
              <PlayCircle color={theme.textMuted} size={32} />
            </View>
            <Text style={[styles.emptyPreviewText, { color: theme.textMuted }]}>
              Paste a valid link above to see preview
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

// -------- WA Status Tab --------
const WAStatusRoute = ({ theme }) => {
  const [statuses, setStatuses] = useState([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkSavedPermission();
  }, []);

  const checkSavedPermission = async () => {
    try {
      const savedUri = await AsyncStorage.getItem('wa_status_dir_uri');
      if (savedUri) {
        setHasPermission(true);
        loadStatuses(savedUri);
      }
    } catch (error) {
      // console.log('Error checking saved URI:', error);
    }
  };

  const changeFolder = async () => {
    try {
      await AsyncStorage.removeItem('wa_status_dir_uri');
      setStatuses([]);
      setHasPermission(false);
      requestDirectoryPermission();
    } catch (error) {
      // console.log('Error removing saved URI:', error);
    }
  };

  const requestDirectoryPermission = async () => {
    try {
      if (Platform.OS === 'web') {
        alert('WhatsApp Status Saver only works on Android devices.');
        return;
      }

      alert('Please select the "Media" folder inside WhatsApp.\n\nPath: Android > media > com.whatsapp > WhatsApp > Media');

      // Open picker normally
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (permissions.granted) {
        alert('Permission Granted! Looking for Statuses...');

        // 1. Read the selected Media folder
        const mediaItems = await StorageAccessFramework.readDirectoryAsync(permissions.directoryUri);

        // 2. Find the hidden .Statuses folder URI from inside Media
        const statusDirUri = mediaItems.find(uri => uri.includes('%2F.Statuses') || uri.includes('/.Statuses'));

        if (!statusDirUri) {
          alert('Could not find .Statuses folder. Are you sure you selected the WhatsApp "Media" folder?');
          return;
        }

        // 3. Read the actual Statuses folder
        const files = await StorageAccessFramework.readDirectoryAsync(statusDirUri);

        // 4. Filter only media files
        const statusFiles = files.filter(f => f.toLowerCase().endsWith('.mp4') || f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg'));

        // Save this array of URIs to a state variable to display them later
        setStatuses(statusFiles);
        setHasPermission(true);

        await AsyncStorage.setItem('wa_status_dir_uri', permissions.directoryUri);

      } else {
        alert('Permission Denied.');
      }
    } catch (error) {
      // console.error("SAF Error:", error);
      alert('Read Error: ' + error.message);
    }
  };

  const loadStatuses = async (savedMediaUri) => {
    try {
      const mediaItems = await StorageAccessFramework.readDirectoryAsync(savedMediaUri);
      const statusDirUri = mediaItems.find(uri => uri.includes('%2F.Statuses') || uri.includes('/.Statuses'));

      if (statusDirUri) {
        const files = await StorageAccessFramework.readDirectoryAsync(statusDirUri);
        const statusFiles = files.filter(f => f.endsWith('.mp4') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
        setStatuses(statusFiles);
      }
    } catch (error) {
      // console.error("Auto-load failed:", error);
    }
  };

  const saveToGallery = async (uri) => {
    try {
      // Request full access (read/write) for album management
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Needs gallery permission to save files.');
        return;
      }

      const isVideo = uri.toLowerCase().includes('.mp4');
      const filename = `status_${Date.now()}${isVideo ? '.mp4' : '.jpg'}`;
      const localUri = FileSystem.cacheDirectory + filename;

      try {
        await FileSystem.copyAsync({
          from: uri,
          to: localUri
        });
      } catch (e) {
        const base64Data = await StorageAccessFramework.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        await FileSystem.writeAsStringAsync(localUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
      }

      await saveToSpecificAlbum(localUri, 'Wa status');
      Alert.alert('Success', 'Saved to Gallery!');
    } catch (e) {
      Alert.alert('Error', 'Failed to save status.');
      // console.log(e);
    }
  };

  const renderItem = ({ item }) => {
    const isVideo = item.toLowerCase().includes('.mp4');

    return (
      <View style={[styles.statusCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.statusImageWrapper}>
          <Image source={{ uri: item }} style={styles.statusImage} />
          {isVideo && (
            <View style={styles.statusPlayOverlay}>
              <Video color="#ffffff" size={24} />
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.primary }]}
          onPress={() => saveToGallery(item)}
        >
          <Download color="#ffffff" size={16} />
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!hasPermission) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.permissionIcon, { backgroundColor: theme.surface }]}>
          <FolderOpen color={theme.primary} size={48} />
        </View>
        <Text style={[styles.permissionTitle, { color: theme.text }]}>Access WhatsApp Status</Text>
        <Text style={[styles.permissionDesc, { color: theme.textMuted }]}>
          Please select the WhatsApp Status folder to view and save statuses.
          {'\n\n'}
          Older devices: WhatsApp/Media/.Statuses
          {'\n'}
          Newer Androids: Android/media/com.whatsapp/WhatsApp/Media/.Statuses
        </Text>
        <TouchableOpacity
          style={[styles.grantButton, { backgroundColor: theme.primary }]}
          onPress={requestDirectoryPermission}
          disabled={loading}
        >
          <Text style={styles.grantButtonText}>{loading ? 'Loading...' : 'Grant Permission'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.tabContainer, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        style={{ backgroundColor: theme.surface, padding: 12, margin: 16, marginBottom: 8, borderRadius: 8, alignItems: 'center', borderColor: theme.border, borderWidth: 1 }}
        onPress={changeFolder}
      >
        <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Switch WA Account / Folder</Text>
      </TouchableOpacity>
      {statuses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ color: theme.textMuted }}>No Statuses Found</Text>
        </View>
      ) : (
        <FlatList
          data={statuses}
          keyExtractor={(item) => item}
          numColumns={2}
          contentContainerStyle={styles.statusList}
          renderItem={renderItem}
        />
      )}
    </View>
  );
};

// -------- Main App Configuration --------
export default function App() {
  const [isDark, setIsDark] = useState(true);
  const theme = isDark ? darkTheme : lightTheme;
  const layout = useWindowDimensions();

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'downloader', title: 'Social Downloader' },
    { key: 'status', title: 'WA Status' },
  ]);

  const renderScene = SceneMap({
    downloader: () => <DownloaderRoute theme={theme} />,
    status: () => <WAStatusRoute theme={theme} />,
  });

  const renderTabBar = (props) => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: theme.primary, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 }}
      style={{ backgroundColor: theme.surface, elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: theme.border }}
      activeColor={theme.primary}
      inactiveColor={theme.textMuted}
      labelStyle={{ fontWeight: '600', textTransform: 'none', fontSize: 16 }}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.appHeader}>
        <Text style={[styles.title, { color: theme.text }]}>Social Tools</Text>
        <TouchableOpacity
          style={[styles.themeToggle, { backgroundColor: theme.background }]}
          onPress={() => setIsDark(!isDark)}
        >
          {isDark ? <Sun color={theme.text} size={20} /> : <Moon color={theme.text} size={20} />}
        </TouchableOpacity>
      </View>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={renderTabBar}
      />
    </View>
  );
}

// -------- Styles --------
const styles = StyleSheet.create({
  appHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  themeToggle: {
    padding: 10,
    borderRadius: 12,
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingRight: 10,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  pasteText: {
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
  },
  optionsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  segmentText: {
    fontWeight: '600',
    fontSize: 15,
  },
  qualityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  qualityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  qualityText: {
    fontWeight: '600',
    fontSize: 14,
  },
  downloadButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 30,
    elevation: 4,
  },
  buttonIcon: {
    marginRight: 10,
  },
  downloadButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  previewSection: {
    flex: 1,
  },
  previewSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyPreviewText: {
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  previewCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  playOverlay: {
    position: 'absolute',
    top: 76,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 40,
  },
  previewInfo: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoDetails: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContainer: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  permissionIcon: {
    padding: 24,
    borderRadius: 40,
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  permissionDesc: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  grantButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    elevation: 3,
  },
  grantButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusList: {
    padding: 12,
  },
  statusCard: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statusImageWrapper: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#000',
  },
  statusImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statusPlayOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -16,
    marginLeft: -16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 16,
    padding: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
  }
});
