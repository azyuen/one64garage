import { Route, Routes } from 'react-router-dom';
import Nav from './components/Nav';
import ErrorBoundary from './components/ErrorBoundary';
import Garage from './pages/Garage';
import CarDetail from './pages/CarDetail';
import CarForm from './pages/CarForm';
import TakeOut from './pages/TakeOut';
import Journal from './pages/Journal';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Garage />} />
            <Route path="/car/:id" element={<CarDetail />} />
            <Route path="/car/:id/edit" element={<CarForm />} />
            <Route path="/add" element={<CarForm />} />
            <Route path="/take-out" element={<TakeOut />} />
            <Route path="/journal" element={<Journal />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}
