import firebase from "@react-native-firebase/app";
import auth from "@react-native-firebase/auth";
import { type FirebaseAuthTypes } from "@react-native-firebase/auth";

const app = firebase.app();
const authInstance = auth();

export { app, authInstance as auth };
export type User = FirebaseAuthTypes.User;
export type ConfirmationResult = FirebaseAuthTypes.ConfirmationResult;
