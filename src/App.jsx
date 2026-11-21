import { MapView, PlannerPanel } from './features/map'
import { SimulationLayer, SimulationPanel } from './features/simulation'
import { TrafficLayer, TrafficPanel } from './features/traffic'
import { RoastBanner, DirectionsCard } from './features/roasts'
import { CaptchaModal } from './features/captcha'
import { DemoPanel } from './features/demo'

class ErrorBoundary extends React.Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(err) { console.error('ErrorBoundary caught:', err) }
  render() {
    if (this.state.hasError) return <div className="slot error-chip">⚠️ Component crashed</div>
    return this.props.children
  }
}

function Slot({ className, children }) {
  return <div className={`slot ${className}`}><div className="panel">{children}</div></div>
}

function App() {
  return (
    <div className="app">
      <MapView>
        <TrafficLayer />
        <SimulationLayer />
      </MapView>
      <Slot className="slot-top-left"><ErrorBoundary><PlannerPanel /></ErrorBoundary></Slot>
      <Slot className="slot-top-center"><ErrorBoundary><DirectionsCard /></ErrorBoundary></Slot>
      <Slot className="slot-top-right"><ErrorBoundary><TrafficPanel /></ErrorBoundary></Slot>
      <Slot className="slot-bottom-left"><ErrorBoundary><SimulationPanel /></ErrorBoundary></Slot>
      <Slot className="slot-bottom-center"><ErrorBoundary><RoastBanner /></ErrorBoundary></Slot>
      <Slot className="slot-bottom-right"><ErrorBoundary><DemoPanel /></ErrorBoundary></Slot>
      <CaptchaModal />
    </div>
  )
}

export default App