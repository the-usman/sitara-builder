import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { Form } from '@remix-run/react';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className={classNames('flex items-center p-5 border-b h-[var(--header-height)]', {
        'border-transparent': !chat.started,
        'border-bolt-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer">
        <div className="i-ph:sidebar-simple-duotone text-xl" />
        <a href="/" className="text-2xl font-semibold text-accent flex items-center">
          {/* <span className="i-bolt:logo-text?mask w-[46px] inline-block" /> */}
          <img src="/logo-light-styled.png" alt="logo" className="w-[90px] inline-block dark:hidden" />
          <img src="/logo-dark-styled.png" alt="logo" className="w-[90px] inline-block hidden dark:block" />
        </a>
      </div>
      {chat.started && ( // Display ChatDescription and HeaderActionButtons only when the chat has started.
        <>
          <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              <div className="mr-1">
                <HeaderActionButtons />
              </div>
            )}
          </ClientOnly>
        </>
      )}
      {!chat.started && <div className="flex-1" />}
      <ClientOnly>
        {() => (
          <div className="flex items-center gap-2 ml-3">
            <a
              href="/skills"
              title="Skills"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary border border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive rounded-lg transition-colors"
            >
              <div className="i-ph:puzzle-piece text-base" />
              <span>Skills</span>
            </a>
            <a
              href="/projects"
              title="My Projects"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary border border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive rounded-lg transition-colors"
            >
              <div className="i-ph:chat-circle text-base" />
              <span>Chats</span>
            </a>
            <Form method="post" action="/api/auth/logout">
              <button
                type="submit"
                title="Sign out"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary border border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive rounded-lg transition-colors"
              >
                <div className="i-ph:sign-out text-base" />
                <span>Sign out</span>
              </button>
            </Form>
          </div>
        )}
      </ClientOnly>
    </header>
  );
}
