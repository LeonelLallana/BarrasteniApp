import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
// NOTA: Eliminamos 'signInWithCustomToken' de aquí ya que no se usa fuera del entorno de Canvas.
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, onSnapshot, addDoc } from 'firebase/firestore';

// Lucide React Icons (minimalist icons)
import { Home, TrendingUp, CalendarDays, User, PlusCircle, Save, Dumbbell, Clock, Target, Weight, Ruler } from 'lucide-react';

// Ensure Tailwind CSS is loaded (assuming it's available in the environment)
// This is typically handled by the build process or a CDN link in index.html
// For this self-contained immersive, we'll assume it's set up.

// TU CONFIGURACIÓN DE FIREBASE REAL AQUÍ (Pegada directamente de lo que me enviaste)
const firebaseConfig = {
  apiKey: "AIzaSyCd8xS13ROTK8RVO5G21hGdIoNifOYiZ90",
  authDomain: "barrasteniapp.firebaseapp.com",
  projectId: "barrasteniapp",
  storageBucket: "barrasteniapp.firebasestorage.app",
  messagingSenderId: "482947878191",
  appId: "1:482947878191:web:66258db177bf20922ba5da",
  measurementId: "G-HXQBYJH86X"
};

function App() {
  // State for Firebase instances and user ID
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // State for navigation
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'progress', 'calendar', 'profile', 'add-training'

  // State for user data and training logs
  const [userName, setUserName] = useState('Leonel'); // Default name as per example
  const [currentDate, setCurrentDate] = useState('');
  const [weeklyProgress, setWeeklyProgress] = useState({ completed: 0, total: 5 });
  const [totalTimeTrained, setTotalTimeTrained] = '0h 0min'; // Changed to string as it's set directly

  // State for training logs (initialized as empty array)
  const [trainingLogs, setTrainingLogs] = useState([]);

  // State for user profile
  const [profile, setProfile] = useState({
    name: 'Leonel',
    age: '',
    weight: '',
    height: '',
    goals: '',
    photoUrl: 'https://placehold.co/100x100/A0A0A0/FFFFFF?text=LP' // Placeholder for profile pic
  });

  // State for new training form
  const [newTraining, setNewTraining] = useState({
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    trainingType: 'Calistenia',
    muscleGroup: '',
    exercises: [{ name: '', series: '', reps: '', additionalWeight: '', restSeconds: '' }]
  });

  // Initialize Firebase and handle authentication
  useEffect(() => {
    try {
      // No longer using __app_id or __firebase_config from Canvas environment
      // const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-calisthenics-app-id';
      // const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestore);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
          console.log("User signed in:", user.uid);
        } else {
          // Sign in anonymously if no custom token is provided (as __initial_auth_token is not available outside Canvas)
          // Removed the check for __initial_auth_token as it's not relevant here
          await signInAnonymously(firebaseAuth);
          console.log("Signed in anonymously.");
        }
        setIsAuthReady(true); // Auth is ready after initial check/sign-in
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error initializing Firebase:", error);
    }
  }, []); // Empty dependency array means this runs once on component mount

  // Fetch user profile and training logs once auth is ready
  useEffect(() => {
    if (db && userId && isAuthReady) {
      // Fetch user profile
      // Using firebaseConfig.projectId instead of __app_id
      const profileDocRef = doc(db, `artifacts/${firebaseConfig.projectId}/users/${userId}/profile`, 'userProfile');
      const unsubscribeProfile = onSnapshot(profileDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        } else {
          // Create a default profile if it doesn't exist
          setDoc(profileDocRef, profile, { merge: true }).catch(e => console.error("Error setting default profile:", e));
        }
      }, (error) => console.error("Error fetching profile:", error));

      // Fetch training logs
      // Using firebaseConfig.projectId instead of __app_id
      const trainingLogsColRef = collection(db, `artifacts/${firebaseConfig.projectId}/users/${userId}/trainingLogs`);
      const q = query(trainingLogsColRef);
      const unsubscribeLogs = onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTrainingLogs(logs);
        console.log("Training logs fetched:", logs);
        // Calculate weekly progress and total time trained
        calculateDashboardMetrics(logs);
      }, (error) => console.error("Error fetching training logs:", error));

      return () => {
        unsubscribeProfile();
        unsubscribeLogs();
      };
    }
  }, [db, userId, isAuthReady, profile]); // Added profile to dependencies to avoid stale closure for setDoc

  // Set current date
  useEffect(() => {
    const today = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    setCurrentDate(today.toLocaleDateString('es-ES', options));
  }, []);

  // Calculate dashboard metrics (weekly progress, total time)
  const calculateDashboardMetrics = (logs) => {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    let completedTrainings = 0;
    let totalMinutesTrained = 0;

    logs.forEach(log => {
      const logDate = new Date(log.date);
      if (logDate >= startOfWeek) {
        completedTrainings++;
        // Assuming each training session is roughly 45-60 minutes for calculation example
        // In a real app, you'd track duration per session
        totalMinutesTrained += 60; // Example: 60 minutes per session
      }
    });

    setWeeklyProgress({ completed: completedTrainings, total: 5 }); // Assuming 5 planned trainings
    const hours = Math.floor(totalMinutesTrained / 60);
    const minutes = totalMinutesTrained % 60;
    setTotalTimeTrained(`${hours}h ${minutes}min`);
  };

  // Handle input changes for new training form
  const handleExerciseChange = (index, field, value) => {
    const updatedExercises = [...newTraining.exercises];
    updatedExercises[index][field] = value;
    setNewTraining({ ...newTraining, exercises: updatedExercises });
  };

  const addExerciseRow = () => {
    setNewTraining({
      ...newTraining,
      exercises: [...newTraining.exercises, { name: '', series: '', reps: '', additionalWeight: '', restSeconds: '' }]
    });
  };

  const removeExerciseRow = (index) => {
    const updatedExercises = newTraining.exercises.filter((_, i) => i !== index);
    setNewTraining({ ...newTraining, exercises: updatedExercises });
  };

  // Save Training
  const handleSaveTraining = async () => {
    if (!db || !userId) {
      console.error("Firestore not initialized or user not logged in.");
      return;
    }
    try {
      // Using firebaseConfig.projectId instead of __app_id
      const trainingLogsColRef = collection(db, `artifacts/${firebaseConfig.projectId}/users/${userId}/trainingLogs`);
      await addDoc(trainingLogsColRef, newTraining);
      console.log("Training saved successfully!");
      // Reset form or navigate back to home
      setNewTraining({
        date: new Date().toISOString().split('T')[0],
        trainingType: 'Calistenia',
        muscleGroup: '',
        exercises: [{ name: '', series: '', reps: '', additionalWeight: '', restSeconds: '' }]
      });
      setActiveTab('home'); // Go back to home after saving
    } catch (error) {
      console.error("Error saving training:", error);
    }
  };

  // Handle profile updates
  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const saveProfile = async () => {
    if (!db || !userId) {
      console.error("Firestore not initialized or user not logged in.");
      return;
    }
    try {
      // Using firebaseConfig.projectId instead of __app_id
      const profileDocRef = doc(db, `artifacts/${firebaseConfig.projectId}/users/${userId}/profile`, 'userProfile');
      await setDoc(profileDocRef, profile, { merge: true });
      console.log("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  // Render different screens based on activeTab
  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="p-4 bg-gray-50 min-h-screen flex flex-col">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">Hola, {profile.name} 👋</h1>
                {userId && (
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                    ID: {userId}
                  </span>
                )}
              </div>
              <p className="text-gray-500 mt-1">{currentDate}</p>
            </div>

            {/* Quick Summary Dashboard */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Resumen Rápido</h2>

              {/* Weekly Progress */}
              <div className="flex items-center justify-center mb-6">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle
                      className="text-gray-200 stroke-current"
                      strokeWidth="10"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                    ></circle>
                    <circle
                      className="text-green-500 stroke-current"
                      strokeWidth="10"
                      strokeLinecap="round"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * (1 - (weeklyProgress.completed / weeklyProgress.total))}
                      style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                    ></circle>
                    <text x="50" y="55" textAnchor="middle" className="text-2xl font-bold text-gray-800">
                      {weeklyProgress.completed}/{weeklyProgress.total}
                    </text>
                  </svg>
                </div>
                <p className="text-lg text-gray-600 ml-4">
                  entrenamientos completados ({((weeklyProgress.completed / weeklyProgress.total) * 100).toFixed(0)}%)
                </p>
              </div>

              {/* Weekly Volume Trend (Placeholder) */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-700 mb-2">Volumen semanal</h3>
                <div className="bg-gray-100 rounded-lg h-24 flex items-center justify-center text-gray-400">
                  <p>Gráfico de tendencia aquí</p>
                </div>
              </div>

              {/* Total Time Trained */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Tiempo total entrenado esta semana</h3>
                <p className="text-2xl font-bold text-gray-800">⏱️ {totalTimeTrained}</p>
              </div>
            </div>

            {/* Add Training Button */}
            <button
              onClick={() => setActiveTab('add-training')}
              className="w-full bg-green-600 text-white py-3 rounded-xl shadow-lg hover:bg-green-700 transition duration-300 flex items-center justify-center text-lg font-semibold"
            >
              <PlusCircle className="mr-2" size={24} /> Añadir Entrenamiento
            </button>
          </div>
        );

      case 'add-training':
        return (
          <div className="p-4 bg-gray-50 min-h-screen flex flex-col">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Añadir Entrenamiento Diario</h1>

            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Fecha:</label>
                <input
                  type="date"
                  value={newTraining.date}
                  onChange={(e) => setNewTraining({ ...newTraining, date: e.target.value })}
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Tipo de entrenamiento:</label>
                <input
                  type="text"
                  value={newTraining.trainingType}
                  onChange={(e) => setNewTraining({ ...newTraining, trainingType: e.target.value })}
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Grupo muscular principal:</label>
                <input
                  type="text"
                  value={newTraining.muscleGroup}
                  onChange={(e) => setNewTraining({ ...newTraining, muscleGroup: e.target.value })}
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mb-4">Ejercicios</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg shadow-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                      <th className="py-3 px-6 text-left">Ejercicio</th>
                      <th className="py-3 px-6 text-left">Series</th>
                      <th className="py-3 px-6 text-left">Reps</th>
                      <th className="py-3 px-6 text-left">Peso Adicional</th>
                      <th className="py-3 px-6 text-left">Segundos</th>
                      <th className="py-3 px-6 text-left"></th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 text-sm">
                    {newTraining.exercises.map((exercise, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-6">
                          <input
                            type="text"
                            value={exercise.name}
                            onChange={(e) => handleExerciseChange(index, 'name', e.target.value)}
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="Dominadas estrictas"
                          />
                        </td>
                        <td className="py-3 px-6">
                          <input
                            type="number"
                            value={exercise.series}
                            onChange={(e) => handleExerciseChange(index, 'series', e.target.value)}
                            className="w-20 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                        </td>
                        <td className="py-3 px-6">
                          <input
                            type="number"
                            value={exercise.reps}
                            onChange={(e) => handleExerciseChange(index, 'reps', e.target.value)}
                            className="w-20 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                        </td>
                        <td className="py-3 px-6">
                          <input
                            type="text"
                            value={exercise.additionalWeight}
                            onChange={(e) => handleExerciseChange(index, 'additionalWeight', e.target.value)}
                            className="w-24 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="0 kg"
                          />
                        </td>
                        <td className="py-3 px-6">
                          <input
                            type="text"
                            value={exercise.restSeconds}
                            onChange={(e) => handleExerciseChange(index, 'restSeconds', e.target.value)}
                            className="w-24 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="-"
                          />
                        </td>
                        <td className="py-3 px-6">
                          <button
                            onClick={() => removeExerciseRow(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            X
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={addExerciseRow}
                className="mt-4 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition duration-300 text-sm flex items-center"
              >
                <PlusCircle size={18} className="mr-1" /> Añadir Ejercicio
              </button>
            </div>

            <button
              onClick={handleSaveTraining}
              className="w-full bg-orange-500 text-white py-3 rounded-xl shadow-lg hover:bg-orange-600 transition duration-300 flex items-center justify-center text-lg font-semibold mt-auto"
            >
              <Save className="mr-2" size={24} /> Guardar Entrenamiento
            </button>
          </div>
        );

      case 'progress':
        return (
          <div className="p-4 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Progreso</h1>

            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Resumen Semanal</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Volumen total (series x reps)</h3>
                  <p className="text-xl text-gray-800">Comparado con la semana pasada: <span className="text-green-500">+5%</span></p>
                  <div className="bg-gray-100 rounded-lg h-16 flex items-center justify-center text-gray-400 mt-2">
                    Gráfico de barras aquí
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Tiempo entrenado total esta semana</h3>
                  <p className="text-xl text-gray-800">⏱️ {totalTimeTrained}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Resumen Mensual</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Volumen mensual acumulado</h3>
                  <div className="bg-gray-100 rounded-lg h-16 flex items-center justify-center text-gray-400 mt-2">
                    Gráfico de líneas aquí
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Mejora en fuerza</h3>
                  <p className="text-xl text-gray-800">Incrementos en reps o carga: <span className="text-blue-500">¡Excelente!</span></p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Recomendaciones Automáticas</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Aumenta un 10% tus repeticiones en dominadas esta semana.</li>
                <li>Prueba entrenar 15 min más cada sesión para acelerar tu progreso.</li>
                <li>Considera añadir un día de descanso activo para una mejor recuperación.</li>
              </ul>
            </div>
          </div>
        );

      case 'calendar':
        return (
          <div className="p-4 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Calendario</h1>
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Vista Mensual</h2>
              <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center text-gray-400">
                <p>Calendario interactivo aquí (días entrenados en verde)</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Entrenamientos Registrados</h2>
              {trainingLogs.length === 0 ? (
                <p className="text-gray-600">No hay entrenamientos registrados aún.</p>
              ) : (
                <ul className="space-y-4">
                  {trainingLogs.map(log => (
                    <li key={log.id} className="border-b border-gray-200 pb-4">
                      <p className="font-semibold text-lg text-gray-800">{log.date} - {log.trainingType}</p>
                      <p className="text-gray-600">Grupo Muscular: {log.muscleGroup}</p>
                      <h4 className="font-medium text-gray-700 mt-2">Ejercicios:</h4>
                      <ul className="list-disc list-inside text-gray-600 text-sm">
                        {log.exercises.map((ex, idx) => (
                          <li key={idx}>
                            {ex.name}: {ex.series} series x {ex.reps} reps ({ex.additionalWeight} kg, {ex.restSeconds} seg)
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="p-4 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Perfil</h1>

            <div className="bg-white rounded-xl shadow-md p-6 mb-6 flex flex-col items-center">
              <img
                src={profile.photoUrl}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-green-400"
              />
              <input
                type="text"
                value={profile.name}
                onChange={(e) => handleProfileChange('name', e.target.value)}
                className="text-2xl font-bold text-gray-800 text-center mb-2 w-full p-2 border rounded-md"
              />
              <p className="text-gray-500 mb-4">ID de Usuario: {userId}</p>

              <div className="w-full space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center"><User size={16} className="mr-1"/> Edad:</label>
                  <input
                    type="number"
                    value={profile.age}
                    onChange={(e) => handleProfileChange('age', e.target.value)}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="Ej: 30"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center"><Weight size={16} className="mr-1"/> Peso (kg):</label>
                  <input
                    type="number"
                    value={profile.weight}
                    onChange={(e) => handleProfileChange('weight', e.target.value)}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="Ej: 75"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center"><Ruler size={16} className="mr-1"/> Altura (cm):</label>
                  <input
                    type="number"
                    value={profile.height}
                    onChange={(e) => handleProfileChange('height', e.target.value)}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="Ej: 175"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center"><Target size={16} className="mr-1"/> Objetivos personales:</label>
                  <textarea
                    value={profile.goals}
                    onChange={(e) => handleProfileChange('goals', e.target.value)}
                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-24 resize-none"
                    placeholder="Ej: Aumentar volumen, fuerza, resistencia..."
                  ></textarea>
                </div>
                <button
                  onClick={saveProfile}
                  className="w-full bg-blue-500 text-white py-3 rounded-xl shadow-lg hover:bg-blue-600 transition duration-300 flex items-center justify-center text-lg font-semibold"
                >
                  <Save className="mr-2" size={24} /> Guardar Perfil
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Ajustes Generales</h2>
              <p className="text-gray-600">Opciones de notificaciones, privacidad, etc. (No implementado en este demo)</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="font-inter antialiased text-gray-900 bg-gray-100 min-h-screen flex flex-col">
      {/* Main content area */}
      <div className="flex-grow pb-16"> {/* Add padding-bottom for the fixed navbar */}
        {renderScreen()}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg flex justify-around items-center h-16 z-50">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 ${activeTab === 'home' ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Home size={24} />
          <span className="text-xs mt-1">Inicio</span>
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 ${activeTab === 'progress' ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <TrendingUp size={24} />
          <span className="text-xs mt-1">Progreso</span>
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 ${activeTab === 'calendar' ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <CalendarDays size={24} />
          <span className="text-xs mt-1">Calendario</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 ${activeTab === 'profile' ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <User size={24} />
          <span className="text-xs mt-1">Perfil</span>
        </button>
      </div>
    </div>
  );
}

export default App;
