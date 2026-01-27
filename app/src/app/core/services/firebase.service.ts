import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: FirebaseApp;
  private _auth: Auth;
  private _firestore: Firestore;

  constructor() {
    this.app = initializeApp(environment.firebase);
    this._auth = getAuth(this.app);
    this._firestore = getFirestore(this.app);
  }

  get auth(): Auth {
    return this._auth;
  }

  get firestore(): Firestore {
    return this._firestore;
  }
}
