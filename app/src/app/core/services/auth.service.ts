import { Injectable, signal, computed, inject } from '@angular/core';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { AppUser } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private firebase = inject(FirebaseService);
  
  private userSignal = signal<AppUser | null>(null);
  private loadingSignal = signal<boolean>(true);

  user = this.userSignal.asReadonly();
  loading = this.loadingSignal.asReadonly();
  isAuthenticated = computed(() => !!this.userSignal());

  constructor() {
    this.initAuthListener();
  }

  private initAuthListener(): void {
    onAuthStateChanged(this.firebase.auth, async (firebaseUser) => {
      if (firebaseUser) {
        const appUser = await this.getOrCreateUser(firebaseUser);
        this.userSignal.set(appUser);
      } else {
        this.userSignal.set(null);
      }
      this.loadingSignal.set(false);
    });
  }

  private async getOrCreateUser(firebaseUser: User): Promise<AppUser> {
    const userRef = doc(this.firebase.firestore, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      // Update last login
      await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
      return userSnap.data() as AppUser;
    }

    // Create new user
    const newUser: AppUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || '',
      photoURL: firebaseUser.photoURL || '',
      createdAt: new Date(),
      lastLogin: new Date(),
    };

    await setDoc(userRef, {
      ...newUser,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });

    return newUser;
  }

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(this.firebase.auth, provider);
  }

  async signOutUser(): Promise<void> {
    await signOut(this.firebase.auth);
  }
}
