import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../Button'

describe('Button コンポーネント', () => {
  it('子要素をレンダリングする', () => {
    render(<Button>送信</Button>)
    expect(screen.getByRole('button', { name: '送信' })).toBeInTheDocument()
  })

  it('クリックイベントを発火する', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>クリック</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('loading 状態で無効化され、読み込み中テキストを表示する', () => {
    render(<Button loading>送信</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('読み込み中...')
  })

  it('disabled 状態でボタンが無効化される', () => {
    render(<Button disabled>送信</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('variant に応じたクラスが適用される', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600')

    rerender(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200')

    rerender(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-red-600')
  })
})
