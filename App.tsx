
import React, { useState, useEffect, Suspense } from 'react';
import { UserRole, User, PatientProfile, Treatment, MedicalFile } from './types';
import { MOCK_DOCTOR } from './constants';
import Navbar from './components/Navbar';
import { authApi, authUtils } from './services/api';

const Dashboard = React.lazy(() => import('./components/Dashboard'));
const AuthScreen = React.lazy(() => import('./components/AuthScreen'));

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [doctors, setDoctors] = useState<User[]>([MOCK_DOCTOR]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize app - check for existing auth token
  useEffect(() => {
    const initializeAuth = async () => {
      const token = authUtils.getToken();
      if (token) {
        try {
          // Verify token and get user profile
          const response = await authApi.getProfile();
          if (response.success && response.data) {
            const user = response.data.user;
            setCurrentUser({
              id: user.id,
              role: user.role === 'patient' ? UserRole.PATIENT : UserRole.DOCTOR,
              name: user.name || user.email, // Fallback if name not available
              email: user.email,
              cnic: user.cnic,
              isVerified: user.isVerified
            });
            if (user.role === 'doctor') {
              try {
                const patientsResponse = await authApi.getPatients();
                if (patientsResponse.success && patientsResponse.data) {
                  setPatients(patientsResponse.data.patients);
                }
              } catch (e) {
                console.error('Failed to load patients on init', e);
              }
            } else if (user.role === 'patient') {
              // Load self as the patient list for dashboard to work
              const patientProfile: PatientProfile = {
                ...user,
                role: UserRole.PATIENT, // ENFORCE it's a patient role as per strict type
                // If backend didn't return these (e.g. from older token), default them
                // However, updated getProfile will return them embedded in user object
                treatments: (user as any).treatments || [],
                medicalHistory: (user as any).medicalHistory || []
              };
              setPatients([patientProfile]);
            }
          }
        } catch (error) {
          // Token is invalid, remove it
          authUtils.removeToken();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const handleLoginSuccess = async (user: User, token: string) => {
    setCurrentUser(user);
    if (user.role === UserRole.DOCTOR) {
      try {
        const response = await authApi.getPatients();
        if (response.success && response.data) {
          setPatients(response.data.patients);
        }
      } catch (error) {
        console.error('Failed to fetch patients:', error);
      }
    } else if (user.role === UserRole.PATIENT) {
      // We need to fetch the full profile to get treatments
      try {
        const response = await authApi.getProfile();
        if (response.success && response.data) {
          const fullUser = response.data.user;
          const patientProfile: PatientProfile = {
            id: fullUser.id,
            role: UserRole.PATIENT,
            name: fullUser.name,
            email: fullUser.email,
            cnic: fullUser.cnic,
            isVerified: fullUser.isVerified,
            treatments: (fullUser as any).treatments || [],
            medicalHistory: (fullUser as any).medicalHistory || []
          };
          setPatients([patientProfile]);
        }
      } catch (error) {
        console.error('Failed to fetch patient profile:', error);
      }
    }
  };

  const handleSignupSuccess = (user: User, token: string) => {
    // Note: With recent changes, this might not be called immediately as we redirect to login
    // But keeping it correct for logic consistency
    setCurrentUser(user);
    setPatients([]);
  };

  const handleLogout = () => {
    authUtils.logout();
    setCurrentUser(null);
  };

  // Signup is now handled through the AuthScreen component and backend API
  // This function is kept for compatibility but no longer used for authentication

  const addTreatment = async (patientId: string, diagnosis: string, medication: string, notes: string, files: MedicalFile[]) => {
    if (!currentUser || currentUser.role !== UserRole.DOCTOR) return;

    try {
      const response = await authApi.addTreatment({
        patientId,
        diagnosis,
        medication,
        notes,
        files
      });

      if (response.success) {
        // Refresh patients list to show new treatment
        const refreshResponse = await authApi.getPatients();
        if (refreshResponse.success && refreshResponse.data) {
          setPatients(refreshResponse.data.patients);
        }
      }
    } catch (error) {
      console.error('Failed to add treatment:', error);
      alert('Failed to save treatment record. Please try again.');
    }
  };

  const deleteTreatment = async (patientId: string, treatmentId: string) => {
    // Security: Only patients can delete their own records in this specific implementation
    if (!currentUser || currentUser.role !== UserRole.PATIENT) return;

    try {
      const response = await authApi.deleteTreatment(treatmentId);

      if (response.success) {
        setPatients(prev => prev.map(p => {
          if (p.id === patientId) {
            return { ...p, treatments: p.treatments.filter(t => t.id !== treatmentId) };
          }
          return p;
        }));
      }
    } catch (error) {
      console.error('Failed to delete treatment:', error);
      alert('Failed to delete record. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-grow container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading MedChain...</p>
            </div>
          </div>
        ) : (
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600">Loading...</p>
              </div>
            </div>
          }>
            {currentUser ? (
              <Dashboard
                user={currentUser}
                patients={patients}
                onAddTreatment={addTreatment}
                onDeleteTreatment={deleteTreatment}
              />
            ) : (
              <AuthScreen onLoginSuccess={handleLoginSuccess} onSignupSuccess={handleSignupSuccess} />
            )}
          </Suspense>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-slate-500 text-sm">
        &copy; 2024 MedChain Systems. Verified Professional Healthcare Environment.
      </footer>
    </div>
  );
};

export default App;
