import type { GlobalProvider } from '@ladle/react';
import './ladle.css';

export const Provider: GlobalProvider = ({ children }) => <div className="font-rm">{children}</div>;
