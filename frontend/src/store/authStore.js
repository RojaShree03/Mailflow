import { create } from 'zustand';
import api from '../services/api';
export const useAuthStore=create((set)=>({admin:null,loading:true,async load(){try{const {data}=await api.get('/auth/me');set({admin:data.admin});}catch{set({admin:null});}finally{set({loading:false});}},async login(email,password){const {data}=await api.post('/auth/login',{email,password});set({admin:data.admin});return data;},async setup(name,email,password){return (await api.post('/auth/setup',{name,email,password})).data;},async logout(){await api.post('/auth/logout');set({admin:null});}}));
