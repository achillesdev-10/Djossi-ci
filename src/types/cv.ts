export interface Experience {
  id: string;
  company: string;
  position: string;
  period: string;
  description: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  year: string;
}

export interface CVData {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  city: string;
  summary: string;
  experiences: Experience[];
  educations: Education[];
  skills: string[];
}

export const createEmptyCV = (): CVData => ({
  fullName: '',
  jobTitle: '',
  email: '',
  phone: '',
  city: '',
  summary: '',
  experiences: [],
  educations: [],
  skills: [],
});

export const createEmptyExperience = (): Experience => ({
  id: crypto.randomUUID(),
  company: '',
  position: '',
  period: '',
  description: '',
});

export const createEmptyEducation = (): Education => ({
  id: crypto.randomUUID(),
  school: '',
  degree: '',
  year: '',
});
