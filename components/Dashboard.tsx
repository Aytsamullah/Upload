
import React, { useState, useRef, useMemo } from 'react';
import { User, UserRole, PatientProfile, Treatment, MedicalFile } from '../types';
import { generateTreatmentPDF } from '../utils/pdfGenerator';

interface DashboardProps {
  user: User;
  patients: PatientProfile[];
  onAddTreatment: (patientId: string, diagnosis: string, medication: string, notes: string, files: MedicalFile[]) => void;
  onDeleteTreatment: (patientId: string, treatmentId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, patients, onAddTreatment, onDeleteTreatment }) => {
  const isDoctor = user.role === UserRole.DOCTOR;
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isAddingTreatment, setIsAddingTreatment] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCnic, setSearchCnic] = useState('');
  const [searchError, setSearchError] = useState('');

  // Modal Form State
  const [diagnosis, setDiagnosis] = useState('');
  const [medication, setMedication] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<MedicalFile[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter patients based on search and role
  const filteredPatients = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return patients.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.cnic?.toLowerCase().includes(query)
    );
  }, [patients, searchQuery]);

  // Determine which patient profile to display
  const activePatient = useMemo(() => {
    if (isDoctor) {
      return patients.find(p => p.id === selectedPatientId) || null;
    }
    // If patient logged in, they only see themselves
    return patients.find(p => p.id === user.id || p.email === user.email) || null;
  }, [isDoctor, patients, selectedPatientId, user.id, user.email]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const filePromises = Array.from(files).map((file: File) => {
      return new Promise<MedicalFile>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fileName: file.name,
            fileType: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
            fileUrl: reader.result as string,
            uploadedAt: new Date().toISOString()
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const newFiles = await Promise.all(filePromises);
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const resetModal = () => {
    setDiagnosis('');
    setMedication('');
    setNotes('');
    setSelectedFiles([]);
    setIsAddingTreatment(false);
  };

  const handleSubmit = () => {
    if (activePatient && diagnosis && medication) {
      onAddTreatment(activePatient.id, diagnosis, medication, notes, selectedFiles);
      resetModal();
    }
  };

  const handleSearch = () => {
    if (!searchCnic.trim()) {
      setSearchError('Please enter a CNIC number');
      return;
    }

    const patient = patients.find(p => p.cnic === searchCnic.trim() || p.cnic?.replace(/-/g, '') === searchCnic.trim().replace(/-/g, ''));

    if (patient) {
      setSearchError('');
      setSelectedPatientId(patient.id);
    } else {
      setSearchError('No patient found with this CNIC. Please check and try again.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-auto lg:h-[calc(100vh-10rem)]">
      {/* Main Content Area - Full Width */}
      <div className="lg:col-span-12 flex flex-col gap-6">
        {!activePatient && isDoctor ? (
          // PATIENT SEARCH VIEW
          <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto w-full animate-in fade-in zoom-in-95 duration-500 px-4">
            <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-blue-900/5 border border-slate-200 w-full text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-700"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-50/50 rounded-full -ml-32 -mb-32 transition-transform group-hover:scale-110 duration-700"></div>

              <div className="relative z-10 space-y-8">
                <div>
                  <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Patient Lookup</h1>
                  <p className="text-slate-500 font-medium">Enter patient CNIC to access medical records</p>
                </div>

                <div className="max-w-sm mx-auto space-y-4">
                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={searchCnic}
                      onChange={(e) => setSearchCnic(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="e.g. 35202-1234567-1"
                      className="w-full bg-slate-50 border-2 border-slate-100 text-slate-900 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 focus:bg-white focus:shadow-xl focus:shadow-blue-500/10 transition-all font-bold font-mono placeholder:font-sans placeholder:font-normal"
                    />
                  </div>

                  {searchError && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl animate-in slide-in-from-top-2 border border-red-100 flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {searchError}
                    </div>
                  )}

                  <button
                    onClick={handleSearch}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95 flex items-center justify-center space-x-2"
                  >
                    <span>Access Records</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                </div>

                <div className="pt-8 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Authorized Personnel Only • HIPAA Compliant
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : activePatient ? (
          // PATIENT DETAIL VIEW
          <>
            {/* Patient Header Card */}
            <div className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100 transition-colors duration-500"></div>

              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="w-full md:w-auto">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                    {isDoctor && (
                      <button
                        onClick={() => setSelectedPatientId(null)}
                        className="mr-1 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                        title="Back to Patient List"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                      </button>
                    )}
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{activePatient.name}</h1>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Active Patient</span>
                  </div>
                  <p className="text-slate-500 text-sm font-medium flex flex-wrap items-center gap-2 sm:gap-0">
                    <span className="mr-3 font-mono">ID: {activePatient.id}</span>
                    <span className="hidden sm:inline w-1 h-1 bg-slate-300 rounded-full mr-3"></span>
                    <span className="font-mono">CNIC: {activePatient.cnic}</span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Primary Contact</p>
                    <p className="text-sm font-semibold text-slate-700 truncate">{activePatient.email}</p>
                  </div>
                  {isDoctor && (
                    <button
                      onClick={() => setIsAddingTreatment(true)}
                      className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
                    >
                      New Clinical Record
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Longitudinal History</h3>
                  <div className="flex flex-wrap gap-2">
                    {activePatient.medicalHistory.length > 0 ? (
                      activePatient.medicalHistory.map((item, idx) => (
                        <span key={idx} className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm">
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Clear history</span>
                    )}
                  </div>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-center text-center">
                  <p className="text-3xl font-black text-blue-600">{activePatient.treatments.length}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recorded Encounters</p>
                </div>
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex flex-col justify-center text-center">
                  <p className="text-sm font-bold text-emerald-700">Verified System</p>
                  <p className="text-[10px] text-emerald-600">All records are encrypted at rest</p>
                </div>
              </div>
            </div>

            {/* Treatment Journal */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex-grow overflow-hidden flex flex-col">
              <div className="px-4 sm:px-8 py-5 border-b border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h2 className="font-bold text-slate-900 flex items-center">
                  Clinical Timeline
                  <span className="ml-3 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">Auto-Sync Active</span>
                </h2>
                {!isDoctor && (
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                    Patient Data Sovereignty Active (Delete Enabled)
                  </span>
                )}
              </div>

              <div className="flex-grow overflow-y-auto p-4 sm:p-8 space-y-6">
                {activePatient.treatments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-300 space-y-4">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <p className="text-sm font-medium">No medical encounters archived yet.</p>
                  </div>
                ) : (
                  [...activePatient.treatments].reverse().map((t) => (
                    <div key={t.id} className="relative pl-10 border-l-2 border-blue-50 pb-8 last:pb-0 group/entry">
                      <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full border-4 border-white bg-blue-600 shadow-md group-hover/entry:scale-125 transition-transform"></div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-100 transition-all duration-300">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mr-3">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </div>
                            <div>
                              <span className="text-sm font-bold text-slate-900">{t.doctorName}</span>
                              <span className="mx-2 text-slate-300">•</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(t.timestamp).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => activePatient && generateTreatmentPDF(t, activePatient)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Download Record PDF"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </button>
                            {/* Delete Button - Only for Patient User */}
                            {!isDoctor && (
                              <button
                                onClick={() => onDeleteTreatment(activePatient.id, t.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete Record"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">#{t.id.slice(-6)}</span>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Primary Diagnosis</p>
                              <p className="text-base text-slate-900 font-bold">{t.diagnosis}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Prescribed Regimen</p>
                              <p className="text-xs text-blue-700 bg-blue-50 font-bold px-3 py-1.5 rounded-xl border border-blue-100 inline-block">
                                {t.medication}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Clinical Annotations</p>
                            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                              <p className="text-xs text-slate-600 leading-relaxed italic">"{t.notes}"</p>
                            </div>
                          </div>
                        </div>

                        {t.files && t.files.length > 0 && (
                          <div className="mt-6 pt-5 border-t border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Diagnostic Assets</p>
                            <div className="flex flex-wrap gap-3">
                              {t.files.map(file => (
                                <a
                                  key={file.id}
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-3 bg-white border border-slate-200 rounded-2xl p-3 text-xs hover:border-blue-500 hover:shadow-lg transition-all group"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                  </div>
                                  <div>
                                    <div className="text-slate-900 font-bold truncate max-w-[150px]">{file.fileName}</div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">{file.fileType}</div>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-6 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
            <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center">
              <svg className="w-16 h-16 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-900">No records found</h3>
              <p className="text-sm max-w-xs mx-auto leading-relaxed">There are currently no medical records associated with this profile.</p>
            </div>
          </div>
        )}
      </div>

      {isAddingTreatment && activePatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl p-6 sm:p-8 space-y-6 sm:space-y-8 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Post Clinical Encounter</h2>
              <p className="text-sm text-slate-500">Documenting record for <span className="text-blue-600 font-bold">{activePatient.name}</span></p>
            </div>

            <div className="space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Final Diagnosis</label>
                  <input
                    value={diagnosis}
                    onChange={e => setDiagnosis(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                    placeholder="e.g. Acute Viral Infection"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Prescription/Medication</label>
                  <input
                    value={medication}
                    onChange={e => setMedication(e.target.value)}
                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                    placeholder="e.g. Paracetamol 500mg TDS"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Examination Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none h-28 resize-none transition-all"
                  placeholder="Note physical findings, vitals, or patient concerns..."
                ></textarea>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diagnostic Attachments</label>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-full transition-colors"
                  >
                    + Upload Assets
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  onChange={handleFileChange}
                />

                <div className="min-h-[80px] p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-wrap gap-2">
                  {selectedFiles.length === 0 ? (
                    <div className="w-full flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter">No assets queued for upload</div>
                  ) : (
                    selectedFiles.map(file => (
                      <div key={file.id} className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-bold shadow-sm animate-in fade-in slide-in-from-left-2">
                        <span className="text-slate-700 truncate max-w-[100px]">{file.fileName}</span>
                        <button onClick={() => removeFile(file.id)} className="ml-2 text-red-400 hover:text-red-600 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={resetModal}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-all active:scale-95"
              >
                Discard Draft
              </button>
              <button
                onClick={handleSubmit}
                disabled={!diagnosis || !medication}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50 active:scale-95"
              >
                Commit to Journal
              </button>
            </div>
            <div className="flex items-center justify-center space-x-2 opacity-50">
              <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">End-to-End Encrypted Tunnel</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
