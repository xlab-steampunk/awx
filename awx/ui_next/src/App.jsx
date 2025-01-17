import React, { useEffect } from 'react';
import {
  useRouteMatch,
  useLocation,
  HashRouter,
  Route,
  Switch,
  Redirect,
} from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@lingui/core';
import { Card, PageSection } from '@patternfly/react-core';

import { ConfigProvider, useAuthorizedPath } from './contexts/Config';
import AppContainer from './components/AppContainer';
import Background from './components/Background';
import ContentError from './components/ContentError';
import NotFound from './screens/NotFound';
import Login from './screens/Login';

import { isAuthenticated } from './util/auth';
import { getLanguageWithoutRegionCode } from './util/language';
import { dynamicActivate, locales } from './i18nLoader';
import Metrics from './screens/Metrics';

import getRouteConfig from './routeConfig';
import SubscriptionEdit from './screens/Setting/Subscription/SubscriptionEdit';

function ErrorFallback({ error }) {
  return (
    <PageSection>
      <Card>
        <ContentError error={error} />
      </Card>
    </PageSection>
  );
}

const AuthorizedRoutes = ({ routeConfig }) => {
  const isAuthorized = useAuthorizedPath();
  const match = useRouteMatch();

  if (!isAuthorized) {
    return (
      <Switch>
        <ProtectedRoute
          key="/subscription_management"
          path="/subscription_management"
        >
          <PageSection>
            <Card>
              <SubscriptionEdit />
            </Card>
          </PageSection>
        </ProtectedRoute>
        <Route path="*">
          <Redirect to="/subscription_management" />
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      {routeConfig
        .flatMap(({ routes }) => routes)
        .map(({ path, screen: Screen }) => (
          <ProtectedRoute key={path} path={path}>
            <Screen match={match} />
          </ProtectedRoute>
        ))
        .concat(
          <ProtectedRoute key="metrics" path="/metrics">
            <Metrics />
          </ProtectedRoute>,
          <ProtectedRoute key="not-found" path="*">
            <NotFound />
          </ProtectedRoute>
        )}
    </Switch>
  );
};

const ProtectedRoute = ({ children, ...rest }) =>
  isAuthenticated(document.cookie) ? (
    <Route {...rest}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        {children}
      </ErrorBoundary>
    </Route>
  ) : (
    <Redirect to="/login" />
  );

function App() {
  let language = getLanguageWithoutRegionCode(navigator);
  if (!Object.keys(locales).includes(language)) {
    // If there isn't a string catalog available for the browser's
    // preferred language, default to one that has strings.
    language = 'en';
  }
  useEffect(() => {
    dynamicActivate(language);
  }, [language]);

  const { hash, search, pathname } = useLocation();

  return (
    <I18nProvider i18n={i18n}>
      <Background>
        <Switch>
          <Route exact strict path="/*/">
            <Redirect to={`${pathname.slice(0, -1)}${search}${hash}`} />
          </Route>
          <Route path="/login">
            <Login isAuthenticated={isAuthenticated} />
          </Route>
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
          <ProtectedRoute>
            <ConfigProvider>
              <AppContainer navRouteConfig={getRouteConfig()}>
                <AuthorizedRoutes routeConfig={getRouteConfig()} />
              </AppContainer>
            </ConfigProvider>
          </ProtectedRoute>
        </Switch>
      </Background>
    </I18nProvider>
  );
}

export default () => (
  <HashRouter>
    <App />
  </HashRouter>
);
