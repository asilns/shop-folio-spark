# Store Dashboard Export

This folder contains a standalone version of the Store Dashboard that can be used with Cursor or any other React project.

## Files Included

- `StandaloneStoreDashboard.tsx` - Main dashboard component with mocked data
- `components/` - UI components (Button, Card, Input, etc.)
- `types.ts` - TypeScript type definitions
- `utils.ts` - Utility functions
- `styles.css` - Required CSS styles

## Usage

1. Copy all files to your project
2. Install required dependencies:
   ```bash
   npm install react react-dom lucide-react class-variance-authority clsx tailwind-merge
   ```
3. Import and use the component:
   ```tsx
   import StandaloneStoreDashboard from './StandaloneStoreDashboard';
   
   function App() {
     return <StandaloneStoreDashboard />;
   }
   ```

## Customization

- Modify the `mockData` object in `StandaloneStoreDashboard.tsx` to use your own data
- Update the API calls to connect to your backend
- Customize styling in `styles.css`

## Dependencies

This component uses:
- React 18+
- Tailwind CSS (for styling)
- Lucide React (for icons)