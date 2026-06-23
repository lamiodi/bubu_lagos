import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from './Header';
import { describe, it, expect } from 'vitest';

describe('Header', () => {
  it('renders the logo text', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    expect(screen.getByText('BUBU')).toBeInTheDocument();
    expect(screen.getByText('LAGOS')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    expect(screen.getAllByText('New In').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Log in').length).toBeGreaterThan(0);
  });
});
