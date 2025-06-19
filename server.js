// server.js
const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');

// PERBAIKAN: Tambahkan middleware untuk parsing JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Data kosakata/kanji Jepang untuk tes
// Hapus/ganti bagian japaneseVocabulary dengan ini:
const vocabularyFiles = {
  minna43: require('./data/minna43.json'),
  minna44: require('./data/minna44.json'),
  kanjin4: require('./data/n4.json'),
  kanjin5: require('./data/n5.json')
};


// Fungsi untuk mengacak array
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getAvailableVocabs() {
  return Object.keys(vocabularyFiles).map(key => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1)
  }));
}

// Modifikasi fungsi generateKraepelinQuestion untuk menerima vocab parameter
function generateKraepelinQuestion(vocabId = 'vocab1') {
  const selectedVocab = vocabularyFiles[vocabId] || vocabularyFiles.vocab1;
  const vocab = selectedVocab[Math.floor(Math.random() * selectedVocab.length)];
  const questionTypes = ['kanji-to-meaning', 'reading-to-meaning', 'meaning-to-kanji'];
  const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
  
  let question, correct, options;
  
  switch(type) {
    case 'kanji-to-meaning':
      question = vocab.kanji;
      correct = vocab.meaning;
      options = [vocab.meaning];
      break;
    case 'reading-to-meaning':
      question = vocab.reading;
      correct = vocab.meaning;
      options = [vocab.meaning];
      break;
    case 'meaning-to-kanji':
      question = vocab.meaning;
      correct = vocab.kanji;
      options = [vocab.kanji];
      break;
  }
  
  // Tambahkan opsi salah
  const wrongOptions = shuffleArray(selectedVocab.filter(v => v !== vocab)).slice(0, 3);
  wrongOptions.forEach(v => {
    switch(type) {
      case 'kanji-to-meaning':
      case 'reading-to-meaning':
        options.push(v.meaning);
        break;
      case 'meaning-to-kanji':
        options.push(v.kanji);
        break;
    }
  });
  
  return {
    question,
    options: shuffleArray(options),
    correct,
    type
  };
}

// Tambahkan route baru untuk mendapatkan daftar vocab
app.get('/api/vocabs', (req, res) => {
  try {
    res.json(getAvailableVocabs());
  } catch (error) {
    console.error('Error getting vocabs:', error);
    res.status(500).json({ error: 'Failed to get vocabulary list' });
  }
});

// Modifikasi route /api/test/generate
app.get('/api/test/generate', (req, res) => {
  try {
    const { duration = 60, interval = 5, vocab = 'vocab1' } = req.query;
    const totalQuestions = Math.floor(duration / interval);
    const questions = [];
    
    // Validasi vocab yang dipilih
    if (!vocabularyFiles[vocab]) {
      return res.status(400).json({ error: 'Invalid vocabulary selected' });
    }
    
    for (let i = 0; i < totalQuestions; i++) {
      questions.push(generateKraepelinQuestion(vocab));
    }
    
    res.json({
      questions,
      duration: parseInt(duration),
      interval: parseInt(interval),
      totalQuestions,
      selectedVocab: vocab
    });
  } catch (error) {
    console.error('Error generating test:', error);
    res.status(500).json({ error: 'Failed to generate test' });
  }
});

// PERBAIKAN: Tambahkan error handling dan validasi input
app.post('/api/test/submit', (req, res) => {
  try {
    
    const { answers, duration, interval, startTime, endTime } = req.body;
    
    // Validasi input
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid answers data' });
    }
    
    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'Invalid time data' });
    }
    
    const totalTime = endTime - startTime;
    const totalQuestions = answers.length;
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const wpm = totalQuestions > 0 ? (totalQuestions / (totalTime / 60000)) : 0;
    
    const result = {
      totalQuestions,
      correctAnswers,
      wrongAnswers: totalQuestions - correctAnswers,
      accuracy: Math.round(accuracy * 100) / 100,
      wpm: Math.round(wpm * 100) / 100,
      totalTime: Math.round(totalTime / 1000),
      duration: parseInt(duration) || 0,
      interval: parseInt(interval) || 0,
      timestamp: new Date().toISOString()
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error submitting test:', error);
    res.status(500).json({ error: 'Failed to submit test', details: error.message });
  }
});

app.get('/api/statistics', (req, res) => {
  try {
    // Statistik dasar untuk referensi
    const stats = {
      averageAccuracy: 0,
      averageWpm: 0,
      totalTests: 0,
      bestAccuracy: 0,
      bestWpm: 0,
      improvement: 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));