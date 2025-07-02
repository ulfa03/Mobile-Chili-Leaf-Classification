import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

type ScreenType = 'dashboard' | 'predict' | 'imagePreview' | 'result' | 'detailResult' | 'history' | 'about';

type PredictionResult = {
  disease: string;
  accuracy: string;
  symptoms: string;
  treatment: string;
  class_index: number;
};

type HistoryItem = {
  id: number;
  disease: string;
  date: string;
  accuracy: string;
  image: string;
  symptoms: string;
  treatment: string;
};

// API Configuration
const API_BASE_URL = 'http://192.168.176.42:5000'; 

// Disease information database
const diseaseInfo = {
  'Healthy': {
    symptoms: 'Daun cabai terlihat sehat dengan warna hijau segar, tidak ada bercak atau kelainan yang terlihat.',
    treatment: 'Pertahankan perawatan rutin dengan penyiraman yang cukup, pemupukan teratur, dan pastikan sirkulasi udara yang baik.'
  },
  'Leaf Curl': {
    symptoms: 'Penyakit keriting daun pada cabai dapat disebabkan oleh banyak faktor seperti kekurangan air, kekurangan nutrisi, kurang perawatan, kondisi benih dan bibit selama pembibitan dan hama',
    treatment: 'Gunakan insektisida untuk mengendalikan kutu daun. Perbaiki drainase tanah dan hindari penyiraman berlebihan. Buang daun yang terinfeksi.'
  },
  'Leaf Spot': {
    symptoms: 'Gejala pada penyakit ini berupa bercak kecil pada daun bentuk bulat dan kering. Bercak berdiameter sampai sekitar 0.5 cm, pusat bercak berwarna pucat sampai putih dengan tepi lebih gelap.',
    treatment: 'Mengobati atau membuang tanaman yang terserang, melakukan rotasi tanaman serta menggunakan bibit yang bebas penyakit. Semprot dengan fungisida sesuai dosis.'
  },
  'Whitefly': {
    symptoms: 'Daun menguning, layu, dan terdapat serangga kecil berwarna putih di bagian bawah daun. Daun menjadi lengket karena embun madu.',
    treatment: 'Gunakan perangkap kuning lengket, semprotkan insektisida organik atau sabun insektisida. Jaga kebersihan area tanam dan buang gulma.'
  },
  'Yellowish': {
    symptoms: 'Virus gemini ditularkan oleh hama kutu kebul. Gejala serangan virus gemini pada tanaman cabai bisa dilihat dari bagian daunnya. Helai daun akan mengalami vein clearing yang diawali dari baglan pucuknya',
    treatment: 'Perbaiki nutrisi tanaman dengan pemupukan yang seimbang. Periksa pH tanah dan perbaiki drainase. Berikan pupuk yang mengandung nitrogen dan magnesium.'
  }
};

export default function RawitSehatApp() {
  const [screen, setScreen] = useState<ScreenType>('dashboard');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<any>(null);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);

  const navigateTo = (nextScreen: ScreenType) => {
    setScreen(nextScreen);
  };

  const selectFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access gallery is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setSelectedImageFile(result.assets[0]);
        navigateTo('imagePreview');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image from gallery');
    }
  };

  const takeFromCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera is required!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setSelectedImageFile(result.assets[0]);
        navigateTo('imagePreview');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const predictDisease = async () => {
    if (!selectedImageFile) {
      Alert.alert('Error', 'No image selected');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: selectedImageFile.uri,
        type: 'image/jpeg',
        name: 'image.jpg',
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      console.log('Mengirim permintaan klasifikasi ke server...');
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to get prediction from server');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const diseaseData = diseaseInfo[data.predicted_class as keyof typeof diseaseInfo] || {
        symptoms: 'Informasi gejala tidak tersedia.',
        treatment: 'Konsultasikan dengan ahli pertanian untuk penanganan yang tepat.'
      };

      const result: PredictionResult = {
        disease: data.predicted_class,
        accuracy: `${data.confidence}%`,
        symptoms: diseaseData.symptoms,
        treatment: diseaseData.treatment,
        class_index: data.class_index
      };

      setPredictionResult(result);
      navigateTo('result');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        Alert.alert('Timeout', 'Server terlalu lama merespons. Coba lagi.');
      } else {
        Alert.alert('Error', `Prediction failed: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveToHistory = () => {
    if (predictionResult && selectedImage) {
      const newHistoryItem: HistoryItem = {
        id: Date.now(),
        disease: predictionResult.disease,
        date: new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        accuracy: predictionResult.accuracy,
        image: selectedImage,
        symptoms: predictionResult.symptoms,
        treatment: predictionResult.treatment
      };

      console.log('Menyimpan ke riwayat:', newHistoryItem);
      
      setHistoryData(prev => [newHistoryItem, ...prev]);
      Alert.alert('Success', 'Hasil prediksi berhasil disimpan ke riwayat');
    }
  };

  const deleteHistoryItem = (id: number) => {
    console.log('Mencoba menghapus item riwayat dengan ID:', id);
    Alert.alert(
      'Konfirmasi',
      'Apakah Anda yakin ingin menghapus item ini?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: () => {
          console.log('Menghapus item riwayat dengan ID:', id);
          setHistoryData(prev => prev.filter(item => item.id !== id));
        }}
      ]
    );
  };

  const Dashboard = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardTitle}>Dashboard</Text>
      </View>

      <ScrollView contentContainerStyle={styles.dashboardContent}>
        <View style={styles.header}>
          <View style={styles.characterContainer}>
            <Image 
              source={require('./img/logo.png')} 
              style={styles.logoImage}
            />
          </View>

          <Text style={styles.subtitle}>
            Solusi Pintar untuk{'\n'}
            Memantau Kesehatan Daun Cabai Anda
          </Text>
        </View>

        <View style={styles.menuContainer}>
          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={() => navigateTo('predict')}
            activeOpacity={0.8}
          >
            <Image 
              source={require('./img/search.png')} 
              style={styles.menuIconImage} 
            />
            <Text style={styles.menuText}>Prediksi Penyakit Daun</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={() => navigateTo('history')}
            activeOpacity={0.8}
          >
            <Image 
              source={require('./img/history.png')} 
              style={styles.menuIconImage} 
            />
            <Text style={styles.menuText}>Riwayat Prediksi</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuButton} 
            onPress={() => navigateTo('about')}
            activeOpacity={0.8}
          >
            <Image 
              source={require('./img/about.png')} 
              style={styles.menuIconImage} 
            />
            <Text style={styles.menuText}>Tentang Aplikasi</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  const Predict = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6b7c32" />
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigateTo('dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prediksi Penyakit Daun</Text>
      </View>

      <ScrollView contentContainerStyle={styles.predictContent}>
        <View style={styles.illustrationContainer}>
          <View style={styles.magnifyingGlass}>
            <View style={styles.plantStem} />
            <View style={styles.plantLeaf} />
            <View style={styles.glassCircle}>
              <View style={styles.glassInner} />
            </View>
            <View style={styles.glassHandle} />
          </View>
        </View>

        <Text style={styles.predictTitle}>
          Jaga Daun Cabai Anda, Mulai dari{'\n'}
          Sekarang
        </Text>

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={takeFromCamera}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={24} color="#fff" />
            <Text style={styles.buttonText}>Ambil Dari Kamera</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={selectFromGallery}
            activeOpacity={0.8}
          >
            <Ionicons name="images" size={24} color="#fff" />
            <Text style={styles.buttonText}>Pilih Dari Galeri</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipContainer}>
          <View style={styles.tipDivider} />
          <Text style={styles.tipText}>
            Tips: Pastikan daun cabai jelas dan memiliki pencahayaan yang cukup{'\n'}
            untuk hasil deteksi yang optimal
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  const ImagePreview = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6b7c32" />
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigateTo('predict')}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prediksi Penyakit Daun</Text>
      </View>

      <ScrollView contentContainerStyle={styles.previewContent}>
        <View style={styles.imageContainer}>
          {selectedImage && <Image source={{ uri: selectedImage }} style={styles.previewImage} />}
        </View>

        <Text style={styles.previewText}>
          Gambar Berhasil Dimuat, tekan tombol prediksi untuk menganalisis penyakit
        </Text>

        <View style={styles.previewButtonsContainer}>
          <TouchableOpacity 
            style={styles.previewButton}
            onPress={() => navigateTo('predict')}
            activeOpacity={0.8}
          >
            <Ionicons name="images" size={24} color="#fff" />
            <Text style={styles.buttonText}>Pilih Ulang Gambar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.predictButton, isLoading && styles.disabledButton]}
            onPress={predictDisease}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="analytics" size={24} color="#fff" />
            )}
            <Text style={styles.buttonText}>
              {isLoading ? 'Memproses...' : 'Prediksi Penyakit'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipContainer}>
          <View style={styles.tipDivider} />
          <Text style={styles.tipText}>
            Tips: Pastikan daun cabai jelas dan memiliki pencahayaan yang cukup{'\n'}
            untuk hasil deteksi yang optimal
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  const Result = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6b7c32" />
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigateTo('predict')}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hasil Prediksi Penyakit Daun</Text>
      </View>

      <ScrollView contentContainerStyle={styles.resultContent}>
        <View style={styles.resultCard}>
          <View style={styles.resultImageContainer}>
            {selectedImage && <Image source={{ uri: selectedImage }} style={styles.resultImage} />}
          </View>

          <Text style={styles.resultTitle}>Hasil Prediksi Penyakit Daun</Text>
          
          <View style={styles.resultInfo}>
            <Text style={styles.resultLabel}>Jenis Penyakit : <Text style={styles.resultValue}>{predictionResult?.disease}</Text></Text>
            <Text style={styles.resultLabel}>Tingkat Akurat : <Text style={styles.resultValue}>{predictionResult?.accuracy}</Text></Text>
          </View>

          <View style={styles.symptomSection}>
            <Text style={styles.sectionTitle}>Gejala</Text>
            <Text style={styles.sectionContent}>{predictionResult?.symptoms}</Text>
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={styles.actionButtonSmall}
              onPress={() => navigateTo('dashboard')}
            >
              <Text style={styles.actionButtonText}>Tutup</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButtonSmall}
              onPress={() => navigateTo('detailResult')}
            >
              <Text style={styles.actionButtonText}>Rincian</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButtonSmall} 
              onPress={saveToHistory}
            >
              <Text style={styles.actionButtonText}>Simpan ke Riwayat</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.predictAgainButton}
            onPress={() => navigateTo('predict')}
            activeOpacity={0.8}
          >
            <Ionicons name="analytics" size={24} color="#fff" />
            <Text style={styles.buttonText}>Prediksi Lagi</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipContainer}>
          <View style={styles.tipDivider} />
          <Text style={styles.tipText}>
            Tips: Pastikan daun cabai jelas dan memiliki pencahayaan yang cukup{'\n'}
            untuk hasil deteksi yang optimal
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  const DetailResult = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6b7c32" />
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigateTo('result')}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rincian Prediksi Penyakit Daun</Text>
      </View>

      <ScrollView contentContainerStyle={styles.detailContent}>
        <Text style={styles.detailTitle}>Hasil Prediksi Penyakit Daun</Text>
        
        <View style={styles.detailImageContainer}>
          {selectedImage && <Image source={{ uri: selectedImage }} style={styles.detailImage} />}
        </View>

        <View style={styles.detailInfo}>
          <Text style={styles.detailLabel}>Jenis Penyakit : <Text style={styles.detailValue}>{predictionResult?.disease}</Text></Text>
          <Text style={styles.detailLabel}>Tingkat Akurat : <Text style={styles.detailValue}>{predictionResult?.accuracy}</Text></Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Gejala Penyakit</Text>
          <Text style={styles.detailSectionContent}>{predictionResult?.symptoms}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Pengendalian dan Pengobatan</Text>
          <Text style={styles.detailSectionContent}>{predictionResult?.treatment}</Text>
        </View>

        <View style={styles.detailButtonsRow}>
          <TouchableOpacity 
            style={styles.detailActionButton}
            onPress={() => navigateTo('dashboard')}
          >
            <Text style={styles.detailActionButtonText}>Tutup</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.detailActionButton} 
            onPress={saveToHistory}
          >
            <Text style={styles.detailActionButtonText}>Simpan ke Riwayat</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  const History = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6b7c32" />
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigateTo('dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Riwayat Prediksi</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.historyContent}>
        {historyData.length === 0 ? (
          <View style={styles.emptyHistoryContainer}>
            <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyHistoryText}>Belum ada riwayat prediksi</Text>
            <Text style={styles.emptyHistorySubtext}>
              Lakukan prediksi penyakit daun untuk melihat riwayat di sini
            </Text>
          </View>
        ) : (
          historyData.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.historyItem}
              onPress={() => {
                setSelectedImage(item.image);
                setPredictionResult({
                  disease: item.disease,
                  accuracy: item.accuracy,
                  symptoms: item.symptoms,
                  treatment: item.treatment,
                  class_index: 0
                });
                navigateTo('detailResult');
              }}
            >
              <Image source={{ uri: item.image }} style={styles.historyImage} />
              <View style={styles.historyInfo}>
                <Text style={styles.historyDisease}>{item.disease}</Text>
                <Text style={styles.historyDate}>{item.date}</Text>
                <Text style={styles.historyAccuracy}>Akurasi : {item.accuracy}</Text>
              </View>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => deleteHistoryItem(item.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );

  const About = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6b7c32" />
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigateTo('dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tentang Aplikasi</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.aboutContent}>
        <View style={styles.aboutContainer}>
          <Image 
            source={require('./img/logo.png')} 
            style={styles.aboutLogo}
          />
          <Text style={styles.aboutTitle}>Tentang Aplikasi</Text>
          <Text style={styles.aboutVersion}>Versi 1.0.0</Text>
          <Text style={styles.aboutTitle}>Deskripsi Aplikasi</Text>
          <Text style={styles.aboutDescription}>
            Aplikasi Rawit Sehat adalah aplikasi yang dapat memprediksi penyakit pada daun tanaman cabai rawit. 
            Ada 4 jenis penyakit dan satu daun sehat, penyakit yang dapat diprediksi yaitu daun kuning, bercak daun, 
            daun keriting dan daun hama putih. Dengan aplikasi ini dapat memudahkan pengguna jika ingin mengetahui 
            penyakit yang menyerang tanaman cabai beserta cara penanggulangan dan pengobatannya.
          </Text>
          <View style={styles.aboutFeatures}>
            <Text style={styles.aboutTitle}>Cara Prediksi Penyakit</Text>
            <Text style={styles.featureItem}>1. Pada menu Utama pilih menu prediksi penyakit daun untuk memulai prediksi</Text>
            <Text style={styles.featureItem}>2. Pada halaman prediksi penyakit daun terdapat dua  pilihan untuk mengupload gambar, bisa dari album dan dari galeri.</Text>
            <Text style={styles.featureItem}>3. jika menggunkan kamera maka akan membuka kamera dan dapat juga disesuaikan gambar yang diambil, kemudian pilih prediksi dan akan menampilkan hasil prediksi dapat juga di simpan dalam Riwayat prediksi.</Text>
            <Text style={styles.featureItem}>4. jika menggunkan album foto maka akan membuka album foto dan dapat juga disesuaikan gambar yang dipilh, kemudian pilih prediksi dan akan menampilkan hasil prediksi dapat juga di simpan dalam Riwayat prediksi.</Text>
            <Text style={styles.featureItem}>5. jika memilih menu Riwayat prediksi pada bagian menu Utama maka akan menampilkan Riwayat prediksi yang sebelumnya telah disimpan.</Text>
            <Text style={styles.featureItem}>6. jika memilih menu tentang aplikasi pada menu Utama maka akan menampilkan deskripsi dan cara menggunakan aplikasi</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  switch (screen) {
    case 'dashboard': return <Dashboard />;
    case 'predict': return <Predict />;
    case 'imagePreview': return <ImagePreview />;
    case 'result': return <Result />;
    case 'detailResult': return <DetailResult />;
    case 'history': return <History />;
    case 'about': return <About />;
    default: return <Dashboard />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  // Dashboard Styles
  dashboardHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  dashboardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#374151',
  },
  dashboardContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#fff',
  },
  
  subtitle: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
  },
  menuContainer: {
    padding: 20,
    gap: 16,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b9a47',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    flex: 1,
  },

  // Header Bar Styles
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#6b7c32',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 30, // Tambahan padding untuk status bar
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

  // Predict Screen Styles
  predictContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },
  illustrationContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  magnifyingGlass: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  plantStem: {
    position: 'absolute',
    left: 20,
    top: 35,
    width: 2,
    height: 30,
    backgroundColor: '#92400e',
  },
  plantLeaf: {
    position: 'absolute',
    left: 15,
    top: 30,
    width: 12,
    height: 8,
    backgroundColor: '#22c55e',
    borderRadius: 6,
    transform: [{ rotate: '-20deg' }],
  },
  glassCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#9ca3af',
    backgroundColor: 'rgba(219, 234, 254, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  glassHandle: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 20,
    height: 4,
    backgroundColor: '#9ca3af',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  predictTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  actionButtonsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#8b9a47',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  tipContainer: {
    width: '100%',
    alignItems: 'center',
  },
  tipDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 16,
  },
  tipText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Image Preview Styles
  previewContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#f3f4f6',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  previewButtonsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#8b9a47',
    padding: 16,
    borderRadius: 12,
  },
  predictButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#6b7c32',
    padding: 16,
    borderRadius: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },

  // Result Styles
  resultContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
  },
  resultCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  resultImageContainer: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#f3f4f6',
  },
  resultImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  resultInfo: {
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  resultValue: {
    fontWeight: 'bold',
    color: '#6b7c32',
  },
  symptomSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  actionButtonSmall: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  predictAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#6b7c32',
    padding: 16,
    borderRadius: 12,
  },

  // Detail Result Styles
  detailContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
  },
  detailImageContainer: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#f3f4f6',
  },
  detailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  detailInfo: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  detailValue: {
    fontWeight: 'bold',
    color: '#6b7c32',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  detailSectionContent: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  detailButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    gap: 16,
  },
  detailActionButton: {
    flex: 1,
    backgroundColor: '#8b9a47',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailActionButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },

  // History Styles
  historyContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
  },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  historyImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyDisease: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  historyAccuracy: {
    fontSize: 12,
    color: '#6b7c32',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },

  // About Screen Styles
  // About Screen Styles
  aboutContent: {
    flexGrow: 1,
  },
  aboutContainer: {
    padding: 24,
    alignItems: 'center',
  },
  aboutLogo: {
    width: 150,
    height: 150,
    marginBottom: 16,
  },
 aboutTitle: {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#6b7c32',
  marginBottom: 8,
  textAlign: 'center',  
},
aboutVersion: {
  fontSize: 16,
  color: '#6b7280',
  marginBottom: 16,
  textAlign: 'justify',  
},
 aboutVersion1: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  aboutDescription: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  aboutFeatures: {
    width: '100%',
    paddingHorizontal: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 10,
    lineHeight: 20,
    textAlign: 'justify',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyHistoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  logoImage: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
  },
  
  // Menu Icon Styles
  menuIconImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginRight: 16,
  },

  characterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});