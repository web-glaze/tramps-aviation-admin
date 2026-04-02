import { RouterProvider } from 'react-router-dom';
import ThemeCustomization from './themes';
import { MenuProvider } from './hooks/useMenu';
import { UserProvider } from './hooks/useUser';
import router from './routes';

function App() {
  return (
    <UserProvider>
      <MenuProvider>
        <ThemeCustomization>
          <RouterProvider router={router} />
        </ThemeCustomization>
      </MenuProvider>
    </UserProvider>
  );
}

export default App;
