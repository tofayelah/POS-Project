<?php

namespace Tests\Feature\Pos;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_complete_sale_idempotently()
    {
        $this->markTestIncomplete('Pending implementation');
    }
}
